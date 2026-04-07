"use client";

import {
  type Dispatch,
  type SetStateAction,
  Fragment,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Spec } from "@json-render/core";
import {
  type FlutterExportOptions,
  type GeneratedFile,
  generateFlutterProject,
  generateFlutterWidgetFile,
} from "@json-render/flutter";
import { JsonEditor } from "@visual-json/react";
import type { JsonValue } from "@visual-json/react";
import { toast } from "sonner";
import { CodeBlock } from "@/components/code-block";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const JSON_EDITOR_STYLE = {
  "--vj-bg": "var(--background)",
  "--vj-bg-panel": "var(--background)",
  "--vj-bg-hover": "var(--muted)",
  "--vj-bg-selected": "var(--primary)",
  "--vj-bg-selected-muted": "var(--muted)",
  "--vj-text": "var(--foreground)",
  "--vj-text-selected": "var(--primary-foreground)",
  "--vj-text-muted": "var(--muted-foreground)",
  "--vj-text-dim": "var(--muted-foreground)",
  "--vj-border": "var(--border)",
  "--vj-border-subtle": "var(--border)",
  "--vj-accent": "var(--primary)",
  "--vj-accent-muted": "var(--muted)",
  "--vj-input-bg": "var(--secondary)",
  "--vj-input-border": "var(--border)",
} as CSSProperties;

const SUPPORTED_COMPONENTS = [
  "SafeArea",
  "ScrollContainer",
  "Row",
  "Column",
  "Container",
  "Card",
  "Heading",
  "Paragraph",
  "Label",
  "Text",
  "Button",
  "Pressable",
  "Image",
  "Avatar",
  "Divider",
  "Spacer",
  "Badge",
  "Chip",
  "TextInput",
  "SearchBar",
  "Switch",
  "Checkbox",
  "Slider",
] as const;

type RepeatContext = {
  item?: unknown;
  index?: number;
  basePath?: string;
};

type ActionLogEntry = {
  id: string;
  action: string;
  params: Record<string, unknown>;
  timestamp: string;
};

type RepoWriteResult = {
  targetRoot: string;
  writtenFiles: string[];
  timestamp: string;
};

type ExportOptionsState = {
  className: string;
  widgetFilePath: string;
  appTitle: string;
  packageName: string;
};

const DEFAULT_EXPORT_OPTIONS: ExportOptionsState = {
  className: "ProfileDashboardPage",
  widgetFilePath: "lib/generated_json_render.dart",
  appTitle: "json-render Flutter Example",
  packageName: "json_render_flutter_example",
};

function getEffectiveExportOptions(
  options: ExportOptionsState,
): Required<FlutterExportOptions> {
  return {
    className: options.className.trim() || DEFAULT_EXPORT_OPTIONS.className,
    widgetFilePath:
      options.widgetFilePath.trim() || DEFAULT_EXPORT_OPTIONS.widgetFilePath,
    appTitle: options.appTitle.trim() || DEFAULT_EXPORT_OPTIONS.appTitle,
    packageName:
      options.packageName.trim() || DEFAULT_EXPORT_OPTIONS.packageName,
  };
}

function downloadTextFile(
  fileName: string,
  content: string,
  mimeType = "text/plain;charset=utf-8",
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function toDownloadName(path: string) {
  return path.replaceAll("/", "__");
}

function cloneJson<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSpec(value: unknown): value is Spec {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.root === "string" &&
    isObjectRecord(value.elements) &&
    (value.state === undefined || isObjectRecord(value.state))
  );
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toCssLength(value: unknown): string | number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    return /^-?\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : trimmed;
  }

  return undefined;
}

function firstText(props: Record<string, unknown>, fallback = ""): string {
  const candidates = [
    props.text,
    props.label,
    props.title,
    props.content,
    props.value,
    props.name,
  ];

  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      const text = String(candidate);
      if (text.length > 0) {
        return text;
      }
    }
  }

  return fallback;
}

function getByPath(source: unknown, path: string): unknown {
  if (source == null) {
    return undefined;
  }

  if (!path || path === "/") {
    return source;
  }

  const normalized = path.startsWith("/") ? path.slice(1) : path;
  if (!normalized) {
    return source;
  }

  let current: unknown = source;

  for (const segment of normalized.split("/")) {
    const unescaped = segment.replaceAll("~1", "/").replaceAll("~0", "~");

    if (Array.isArray(current)) {
      const index = Number(unescaped);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (isObjectRecord(current)) {
      current = current[unescaped];
      continue;
    }

    return undefined;
  }

  return current;
}

function setByPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  if (!normalized) {
    return;
  }

  const segments = normalized
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));

  let current: unknown = target;

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index]!;
    const nextSegment = segments[index + 1]!;
    const nextIsIndex = Number.isInteger(Number(nextSegment));

    if (Array.isArray(current)) {
      const currentIndex = Number(segment);
      if (!Number.isInteger(currentIndex) || currentIndex < 0) {
        return;
      }

      while (current.length <= currentIndex) {
        current.push(undefined);
      }

      const existing = current[currentIndex];
      if (Array.isArray(existing) || isObjectRecord(existing)) {
        current = existing;
        continue;
      }

      current[currentIndex] = nextIsIndex ? [] : {};
      current = current[currentIndex];
      continue;
    }

    if (isObjectRecord(current)) {
      const existing = current[segment];
      if (Array.isArray(existing) || isObjectRecord(existing)) {
        current = existing;
        continue;
      }

      current[segment] = nextIsIndex ? [] : {};
      current = current[segment];
      continue;
    }

    return;
  }

  const lastSegment = segments.at(-1);
  if (!lastSegment) {
    return;
  }

  if (Array.isArray(current)) {
    const currentIndex = Number(lastSegment);
    if (!Number.isInteger(currentIndex) || currentIndex < 0) {
      return;
    }

    while (current.length <= currentIndex) {
      current.push(undefined);
    }

    current[currentIndex] = value;
    return;
  }

  if (isObjectRecord(current)) {
    current[lastSegment] = value;
  }
}

function joinJsonPath(basePath: string, segment: string): string {
  if (!basePath || basePath === "/") {
    return `/${segment}`;
  }

  const normalized = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return `${normalized}/${segment}`;
}

function resolveComparisonValue(
  state: Record<string, unknown>,
  value: unknown,
) {
  if (isObjectRecord(value) && typeof value.$state === "string") {
    return getByPath(state, value.$state);
  }

  return value;
}

function evaluateVisibility(
  state: Record<string, unknown>,
  condition: unknown,
  repeatContext: RepeatContext,
): boolean {
  if (condition === null || condition === undefined) {
    return true;
  }

  if (typeof condition === "boolean") {
    return condition;
  }

  if (Array.isArray(condition)) {
    return condition.every((item) =>
      evaluateVisibility(state, item, repeatContext),
    );
  }

  if (!isObjectRecord(condition)) {
    return true;
  }

  if (Array.isArray(condition.$and)) {
    return condition.$and.every((item) =>
      evaluateVisibility(state, item, repeatContext),
    );
  }

  if (Array.isArray(condition.$or)) {
    return condition.$or.some((item) =>
      evaluateVisibility(state, item, repeatContext),
    );
  }

  let currentValue: unknown;

  if (typeof condition.$state === "string") {
    currentValue = getByPath(state, condition.$state);
  } else if (typeof condition.$item === "string") {
    currentValue = condition.$item
      ? getByPath(repeatContext.item, condition.$item)
      : repeatContext.item;
  } else if (condition.$index === true) {
    currentValue = repeatContext.index;
  }

  let result =
    currentValue === true ||
    (currentValue !== null &&
      currentValue !== undefined &&
      currentValue !== false &&
      String(currentValue).length > 0);

  if ("eq" in condition) {
    result = currentValue === resolveComparisonValue(state, condition.eq);
  } else if ("neq" in condition) {
    result = currentValue !== resolveComparisonValue(state, condition.neq);
  } else if ("gt" in condition) {
    const rhs = toNumber(resolveComparisonValue(state, condition.gt));
    const lhs = toNumber(currentValue);
    result = lhs !== undefined && rhs !== undefined && lhs > rhs;
  } else if ("gte" in condition) {
    const rhs = toNumber(resolveComparisonValue(state, condition.gte));
    const lhs = toNumber(currentValue);
    result = lhs !== undefined && rhs !== undefined && lhs >= rhs;
  } else if ("lt" in condition) {
    const rhs = toNumber(resolveComparisonValue(state, condition.lt));
    const lhs = toNumber(currentValue);
    result = lhs !== undefined && rhs !== undefined && lhs < rhs;
  } else if ("lte" in condition) {
    const rhs = toNumber(resolveComparisonValue(state, condition.lte));
    const lhs = toNumber(currentValue);
    result = lhs !== undefined && rhs !== undefined && lhs <= rhs;
  }

  return condition.not === true ? !result : result;
}

function resolveBindingPath(value: unknown, repeatContext: RepeatContext) {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  if (typeof value.$bindState === "string") {
    return value.$bindState;
  }

  if (typeof value.$bindItem === "string" && repeatContext.basePath) {
    return value.$bindItem
      ? joinJsonPath(repeatContext.basePath, value.$bindItem)
      : repeatContext.basePath;
  }

  return undefined;
}

function resolveValue(
  state: Record<string, unknown>,
  value: unknown,
  repeatContext: RepeatContext,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(state, item, repeatContext));
  }

  if (!isObjectRecord(value)) {
    return value;
  }

  if (typeof value.$state === "string") {
    return getByPath(state, value.$state);
  }

  if (typeof value.$item === "string") {
    return value.$item
      ? getByPath(repeatContext.item, value.$item)
      : repeatContext.item;
  }

  if (value.$index === true) {
    return repeatContext.index;
  }

  if (typeof value.$bindState === "string") {
    return getByPath(state, value.$bindState);
  }

  if (typeof value.$bindItem === "string") {
    const resolvedPath = resolveBindingPath(value, repeatContext);
    return resolvedPath ? getByPath(state, resolvedPath) : undefined;
  }

  if ("$cond" in value) {
    return resolveValue(
      state,
      evaluateVisibility(state, value.$cond, repeatContext)
        ? value.$then
        : value.$else,
      repeatContext,
    );
  }

  if (typeof value.$template === "string") {
    return value.$template.replaceAll(/\$\{([^}]+)\}/g, (_, path: string) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const resolved = getByPath(state, normalizedPath);
      return resolved === null || resolved === undefined
        ? ""
        : String(resolved);
    });
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      resolveValue(state, nestedValue, repeatContext),
    ]),
  );
}

function resolveProps(
  state: Record<string, unknown>,
  props: unknown,
  repeatContext: RepeatContext,
): Record<string, unknown> {
  if (!isObjectRecord(props)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [
      key,
      resolveValue(state, value, repeatContext),
    ]),
  );
}

function extractActionBinding(element: Record<string, unknown>) {
  const on = element.on;
  if (isObjectRecord(on)) {
    const preferred = on.press ?? on.tap ?? on.submit ?? on.change;

    if (
      Array.isArray(preferred) &&
      preferred.length > 0 &&
      isObjectRecord(preferred[0])
    ) {
      return preferred[0];
    }

    if (isObjectRecord(preferred)) {
      return preferred;
    }
  }

  const props = element.props;
  if (isObjectRecord(props) && typeof props.action === "string") {
    return {
      action: props.action,
      params: isObjectRecord(props.actionParams) ? props.actionParams : {},
    };
  }

  return undefined;
}

function colorValue(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value;
}

function edgeInsetsStyle(
  styleKey: "padding" | "margin",
  value: unknown,
): CSSProperties {
  const numericValue = toNumber(value);
  if (numericValue !== undefined) {
    return { [styleKey]: numericValue };
  }

  if (!isObjectRecord(value)) {
    return {};
  }

  return {
    [`${styleKey}Left`]: toNumber(value.left) ?? 0,
    [`${styleKey}Top`]: toNumber(value.top) ?? 0,
    [`${styleKey}Right`]: toNumber(value.right) ?? 0,
    [`${styleKey}Bottom`]: toNumber(value.bottom) ?? 0,
  } as CSSProperties;
}

function headingFontSize(level: unknown) {
  switch (Math.trunc(toNumber(level) ?? 2)) {
    case 1:
      return 32;
    case 2:
      return 28;
    case 3:
      return 24;
    case 4:
      return 20;
    default:
      return 18;
  }
}

function mainAxisJustify(value: unknown): CSSProperties["justifyContent"] {
  switch (String(value ?? "")) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "spaceBetween":
      return "space-between";
    case "spaceAround":
      return "space-around";
    case "spaceEvenly":
      return "space-evenly";
    default:
      return "flex-start";
  }
}

function crossAxisAlign(value: unknown): CSSProperties["alignItems"] {
  switch (String(value ?? "")) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "stretch":
      return "stretch";
    default:
      return "flex-start";
  }
}

function alignmentStyle(value: unknown): CSSProperties {
  switch (String(value ?? "")) {
    case "center":
      return {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };
    case "topLeft":
      return {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
      };
    case "topRight":
      return {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      };
    case "bottomLeft":
      return {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-start",
      };
    case "bottomRight":
      return {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
      };
    default:
      return {};
  }
}

function singleChild(children: ReactNode[]) {
  if (children.length === 0) {
    return null;
  }

  if (children.length === 1) {
    return children[0];
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      {children.map((child, index) => (
        <Fragment key={index}>{child}</Fragment>
      ))}
    </div>
  );
}

function runtimeNote(action: string, params: Record<string, unknown>) {
  const paramText = Object.keys(params).length
    ? JSON.stringify(params, null, 2)
    : undefined;

  if (action === "setState") {
    toast.success("State updated", {
      description: paramText,
    });
    return;
  }

  toast.success(`Action: ${action}`, {
    description: paramText,
  });
}

function FlutterMirrorRenderer({
  spec,
  state,
  setState,
  onAction,
}: {
  spec: Spec;
  state: Record<string, unknown>;
  setState: Dispatch<SetStateAction<Record<string, unknown>>>;
  onAction: (action: string, params: Record<string, unknown>) => void;
}) {
  const updateState = (path: string, value: unknown) => {
    setState((current) => {
      const next = cloneJson(current);
      setByPath(next, path, value);
      return next;
    });
  };

  const executeAction = (
    binding: Record<string, unknown>,
    repeatContext: RepeatContext,
  ) => {
    if (typeof binding.action !== "string" || !binding.action) {
      return;
    }

    const params = resolveProps(state, binding.params ?? {}, repeatContext);

    if (binding.action === "setState" && typeof params.statePath === "string") {
      updateState(params.statePath, params.value);
    }

    onAction(binding.action, params);
  };

  const renderElement = (
    key: string,
    repeatContext: RepeatContext = {},
    ignoreRepeat = false,
  ): ReactNode => {
    const rawElement = spec.elements[key];
    if (!rawElement || !isObjectRecord(rawElement)) {
      return null;
    }

    const elementType =
      typeof rawElement.type === "string" ? rawElement.type : "Unknown";
    const childKeys = Array.isArray(rawElement.children)
      ? rawElement.children
      : [];

    if (!evaluateVisibility(state, rawElement.visible, repeatContext)) {
      return null;
    }

    if (!ignoreRepeat && isObjectRecord(rawElement.repeat)) {
      const statePath = rawElement.repeat.statePath;
      if (typeof statePath !== "string") {
        return null;
      }

      const items = getByPath(state, statePath);

      if (!Array.isArray(items)) {
        return null;
      }

      return (
        <>
          {items.map((item, index) => (
            <Fragment key={`${key}-${index}`}>
              {renderElement(
                key,
                {
                  item,
                  index,
                  basePath: joinJsonPath(statePath, String(index)),
                },
                true,
              )}
            </Fragment>
          ))}
        </>
      );
    }

    const props = resolveProps(state, rawElement.props, repeatContext);
    const children = childKeys
      .filter((childKey): childKey is string => typeof childKey === "string")
      .map((childKey) => (
        <Fragment key={childKey}>
          {renderElement(childKey, repeatContext)}
        </Fragment>
      ))
      .filter(Boolean);

    const gap = toNumber(props.gap);
    const baseFlexStyle: CSSProperties = gap !== undefined ? { gap } : {};

    switch (elementType) {
      case "SafeArea":
        return <div className="p-4">{singleChild(children)}</div>;

      case "ScrollContainer": {
        const isHorizontal = props.direction === "horizontal";
        return (
          <div
            className={cn(isHorizontal ? "overflow-x-auto" : "overflow-y-auto")}
          >
            <div
              className={cn(
                "flex",
                isHorizontal ? "w-max flex-row" : "flex-col",
              )}
              style={baseFlexStyle}
            >
              {children}
            </div>
          </div>
        );
      }

      case "Row":
        return (
          <div
            className="flex"
            style={{
              ...baseFlexStyle,
              justifyContent: mainAxisJustify(props.justify),
              alignItems: crossAxisAlign(props.align),
            }}
          >
            {children}
          </div>
        );

      case "Column":
        return (
          <div
            className="flex flex-col"
            style={{
              ...baseFlexStyle,
              alignItems: crossAxisAlign(props.align),
            }}
          >
            {children}
          </div>
        );

      case "Container":
        return (
          <div
            style={{
              width: toCssLength(props.width),
              height: toCssLength(props.height),
              backgroundColor: colorValue(props.backgroundColor ?? props.color),
              borderRadius: toNumber(props.borderRadius),
              ...edgeInsetsStyle("padding", props.padding),
              ...edgeInsetsStyle("margin", props.margin),
              ...alignmentStyle(props.alignment),
            }}
          >
            {singleChild(children)}
          </div>
        );

      case "Card":
        return (
          <div className="rounded-[24px] border border-border/80 bg-card shadow-sm">
            <div
              className="flex flex-col"
              style={{
                gap: toNumber(props.gap) ?? 12,
                padding: toNumber(props.padding) ?? 16,
              }}
            >
              {children.length > 0 ? (
                children
              ) : (
                <div className="text-sm font-medium text-foreground">
                  {firstText(props)}
                </div>
              )}
            </div>
          </div>
        );

      case "Heading": {
        return (
          <div
            className="font-semibold tracking-tight text-foreground"
            style={{ fontSize: headingFontSize(props.level) }}
          >
            {firstText(props)}
          </div>
        );
      }

      case "Paragraph":
      case "Text":
        return (
          <p
            className="leading-relaxed text-foreground/85"
            style={{ fontSize: toNumber(props.fontSize) ?? 14 }}
          >
            {firstText(props)}
          </p>
        );

      case "Label":
        return (
          <div
            className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
            style={{ fontSize: toNumber(props.fontSize) ?? 12 }}
          >
            {firstText(props)}
          </div>
        );

      case "Button": {
        const binding = extractActionBinding(rawElement);
        return (
          <Button
            type="button"
            onClick={
              binding ? () => executeAction(binding, repeatContext) : undefined
            }
          >
            {firstText(props, "Button")}
          </Button>
        );
      }

      case "Pressable": {
        const binding = extractActionBinding(rawElement);
        return (
          <button
            type="button"
            onClick={
              binding ? () => executeAction(binding, repeatContext) : undefined
            }
            className="rounded-2xl text-left transition-colors hover:bg-muted/50"
          >
            {singleChild(children)}
          </button>
        );
      }

      case "Image":
      case "Avatar": {
        const src = props.src ?? props.url ?? props.imageUrl;
        if (typeof src !== "string" || !src) {
          return null;
        }

        const size = toCssLength(props.size);
        return (
          <img
            src={src}
            alt={firstText(props, elementType)}
            className="object-cover"
            style={{
              width: toCssLength(props.width) ?? size,
              height: toCssLength(props.height) ?? size,
              borderRadius:
                elementType === "Avatar" ? 999 : toNumber(props.borderRadius),
            }}
          />
        );
      }

      case "Divider":
        return (
          <div
            className="w-full border-t border-border/80"
            style={{ marginBlock: (toNumber(props.height) ?? 1) * 4 }}
          />
        );

      case "Spacer": {
        const flex = Math.trunc(toNumber(props.flex) ?? 0);
        if (flex > 0) {
          return <div style={{ flex }} />;
        }

        const size = toCssLength(props.size ?? props.height) ?? 8;
        return <div style={{ width: size, height: size }} />;
      }

      case "Badge":
      case "Chip":
        return (
          <span className="inline-flex w-fit items-center rounded-full border border-border/80 bg-muted px-3 py-1 text-xs font-medium">
            {firstText(props, elementType)}
          </span>
        );

      case "TextInput":
      case "SearchBar": {
        const valuePath = resolveBindingPath(
          isObjectRecord(rawElement.props) ? rawElement.props.value : undefined,
          repeatContext,
        );
        const value =
          props.value !== undefined && props.value !== null
            ? String(props.value)
            : props.defaultValue !== undefined && props.defaultValue !== null
              ? String(props.defaultValue)
              : "";

        return (
          <label className="flex flex-col gap-2">
            {props.label ? (
              <span className="text-sm font-medium text-foreground">
                {String(props.label)}
              </span>
            ) : null}
            <div className="relative">
              {elementType === "SearchBar" ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Search
                </span>
              ) : null}
              <Input
                value={value}
                placeholder={
                  props.placeholder === undefined
                    ? undefined
                    : String(props.placeholder)
                }
                className={cn(
                  "h-11 rounded-xl bg-background",
                  elementType === "SearchBar" ? "pl-[4.5rem]" : "",
                )}
                onChange={(event) => {
                  if (!valuePath) {
                    return;
                  }
                  updateState(valuePath, event.target.value);
                }}
              />
            </div>
          </label>
        );
      }

      case "Switch": {
        const valuePath = resolveBindingPath(
          isObjectRecord(rawElement.props) ? rawElement.props.value : undefined,
          repeatContext,
        );

        return (
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {firstText(props, "Switch")}
            </span>
            <input
              type="checkbox"
              checked={props.value === true}
              onChange={(event) => {
                if (!valuePath) {
                  return;
                }
                updateState(valuePath, event.target.checked);
              }}
            />
          </label>
        );
      }

      case "Checkbox": {
        const valuePath = resolveBindingPath(
          isObjectRecord(rawElement.props)
            ? rawElement.props.checked
            : undefined,
          repeatContext,
        );

        return (
          <label className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/40 px-4 py-3">
            <input
              type="checkbox"
              checked={props.checked === true}
              onChange={(event) => {
                if (!valuePath) {
                  return;
                }
                updateState(valuePath, event.target.checked);
              }}
            />
            <span className="text-sm font-medium text-foreground">
              {firstText(props, "Checkbox")}
            </span>
          </label>
        );
      }

      case "Slider": {
        const valuePath = resolveBindingPath(
          isObjectRecord(rawElement.props) ? rawElement.props.value : undefined,
          repeatContext,
        );
        const min = toNumber(props.min) ?? 0;
        const max = toNumber(props.max) ?? 100;
        const current = toNumber(props.value) ?? min;

        return (
          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{firstText(props, "Slider")}</span>
              <span>{current}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={current}
              className="w-full"
              onChange={(event) => {
                if (!valuePath) {
                  return;
                }
                updateState(valuePath, Number(event.target.value));
              }}
            />
          </div>
        );
      }

      default:
        return (
          <div className="rounded-2xl border border-dashed border-border px-4 py-3">
            <div className="text-sm font-semibold text-foreground">
              Unsupported component: {elementType}
            </div>
            {firstText(props) ? (
              <div className="mt-2 text-sm text-muted-foreground">
                {firstText(props)}
              </div>
            ) : null}
            {children.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3">{children}</div>
            ) : null}
          </div>
        );
    }
  };

  return <>{renderElement(spec.root)}</>;
}

export function FlutterPreview({ initialSpec }: { initialSpec: Spec }) {
  const [editorValue, setEditorValue] = useState<JsonValue>(
    initialSpec as unknown as JsonValue,
  );
  const [exportOptions, setExportOptions] = useState<ExportOptionsState>(
    DEFAULT_EXPORT_OPTIONS,
  );
  const [selectedProjectFile, setSelectedProjectFile] = useState<string | null>(
    null,
  );
  const [isWritingToRepo, setIsWritingToRepo] = useState(false);
  const [lastRepoWrite, setLastRepoWrite] = useState<RepoWriteResult | null>(
    null,
  );
  const deferredEditorValue = useDeferredValue(editorValue);
  const parsedSpec = useMemo<Spec | null>(
    () => (isSpec(deferredEditorValue) ? (deferredEditorValue as Spec) : null),
    [deferredEditorValue],
  );
  const [runtimeState, setRuntimeState] = useState<Record<string, unknown>>(
    cloneJson(initialSpec.state ?? {}),
  );
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);

  const stateSeed = useMemo(
    () => JSON.stringify(parsedSpec?.state ?? {}),
    [parsedSpec],
  );
  const effectiveExportOptions = useMemo(
    () => getEffectiveExportOptions(exportOptions),
    [exportOptions],
  );

  useEffect(() => {
    if (!parsedSpec) {
      setRuntimeState({});
      setActionLog([]);
      return;
    }

    setRuntimeState(cloneJson(parsedSpec.state ?? {}));
    setActionLog([]);
  }, [parsedSpec?.root, stateSeed]);

  const generation = useMemo(() => {
    if (!parsedSpec) {
      return {
        file: null,
        projectFiles: [] as GeneratedFile[],
        error:
          "Spec must remain an object with `root` and `elements` before Dart can be generated.",
      };
    }

    try {
      return {
        file: generateFlutterWidgetFile(parsedSpec, effectiveExportOptions),
        projectFiles: generateFlutterProject(
          parsedSpec,
          effectiveExportOptions,
        ),
        error: null,
      };
    } catch (error) {
      return {
        file: null,
        projectFiles: [] as GeneratedFile[],
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate Dart output.",
      };
    }
  }, [effectiveExportOptions, parsedSpec]);

  useEffect(() => {
    setSelectedProjectFile((current) => {
      if (
        current &&
        generation.projectFiles.some((file) => file.path === current)
      ) {
        return current;
      }

      return generation.projectFiles[0]?.path ?? null;
    });
  }, [generation.projectFiles]);

  const runtimeStateJson = useMemo(
    () => JSON.stringify(runtimeState, null, 2),
    [runtimeState],
  );

  const currentSpecJson = useMemo(
    () =>
      parsedSpec
        ? JSON.stringify(parsedSpec, null, 2)
        : JSON.stringify(editorValue, null, 2),
    [editorValue, parsedSpec],
  );
  const selectedProjectFileContent =
    generation.projectFiles.find((file) => file.path === selectedProjectFile)
      ?.content ?? "";

  const handleAction = (action: string, params: Record<string, unknown>) => {
    const nextEntry: ActionLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      params,
      timestamp: new Date().toLocaleTimeString(),
    };

    setActionLog((current) => [nextEntry, ...current].slice(0, 8));
    runtimeNote(action, params);
  };

  const updateExportOption = useCallback(
    <K extends keyof ExportOptionsState>(
      key: K,
      value: ExportOptionsState[K],
    ) => {
      setExportOptions((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const resetExportOptions = useCallback(() => {
    setExportOptions(DEFAULT_EXPORT_OPTIONS);
  }, []);

  const downloadSpec = useCallback(() => {
    downloadTextFile("flutter-spec.json", currentSpecJson, "application/json");
    toast.success("Downloaded flutter-spec.json");
  }, [currentSpecJson]);

  const downloadWidgetFile = useCallback(() => {
    if (!generation.file) {
      return;
    }

    downloadTextFile(
      toDownloadName(generation.file.path),
      generation.file.content,
      "text/x-dart",
    );
    toast.success(`Downloaded ${generation.file.path}`);
  }, [generation.file]);

  const downloadCurrentProjectFile = useCallback(() => {
    const currentFile = generation.projectFiles.find(
      (file) => file.path === selectedProjectFile,
    );
    if (!currentFile) {
      return;
    }

    downloadTextFile(
      toDownloadName(currentFile.path),
      currentFile.content,
      currentFile.path.endsWith(".yaml")
        ? "application/x-yaml"
        : currentFile.path.endsWith(".dart")
          ? "text/x-dart"
          : "text/plain;charset=utf-8",
    );
    toast.success(`Downloaded ${currentFile.path}`);
  }, [generation.projectFiles, selectedProjectFile]);

  const downloadProjectBundle = useCallback(() => {
    if (generation.projectFiles.length === 0) {
      return;
    }

    const bundle = generation.projectFiles
      .map((file) => `// ===== ${file.path} =====\n${file.content}`)
      .join("\n\n");

    downloadTextFile("flutter-project-export.txt", bundle);
    toast.success("Downloaded flutter-project-export.txt");
  }, [generation.projectFiles]);

  const writeToRepo = useCallback(async () => {
    if (!parsedSpec || isWritingToRepo) {
      return;
    }

    setIsWritingToRepo(true);

    try {
      const response = await fetch("/api/flutter-preview/write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spec: parsedSpec,
          exportOptions: effectiveExportOptions,
        }),
      });

      const result = (await response.json()) as
        | {
            ok?: boolean;
            error?: string;
            targetRoot?: string;
            writtenFiles?: string[];
          }
        | undefined;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Failed to write Flutter files");
      }

      const nextWrite: RepoWriteResult = {
        targetRoot: result.targetRoot ?? "examples/flutter",
        writtenFiles: result.writtenFiles ?? [],
        timestamp: new Date().toLocaleTimeString(),
      };

      setLastRepoWrite(nextWrite);
      toast.success(`Wrote ${nextWrite.writtenFiles.length} files to repo`, {
        description: nextWrite.targetRoot,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to write Flutter files",
      );
    } finally {
      setIsWritingToRepo(false);
    }
  }, [effectiveExportOptions, isWritingToRepo, parsedSpec]);

  return (
    <>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1560px] px-4 py-5 lg:px-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Flutter Preview
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Review Flutter examples without leaving the repo
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                This view edits the same sample spec used by{" "}
                <code>examples/flutter/spec.json</code>, mirrors the supported
                Flutter widget subset on the web, and shows the deterministic
                Dart generated by <code>@json-render/flutter</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  startTransition(() =>
                    setEditorValue(initialSpec as unknown as JsonValue),
                  )
                }
              >
                Reset spec
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRuntimeState(
                    cloneJson(parsedSpec?.state ?? initialSpec.state ?? {}),
                  )
                }
              >
                Reset state
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadSpec}
              >
                Download spec
              </Button>
              <CopyButton
                text={currentSpecJson}
                className="text-muted-foreground"
              />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {SUPPORTED_COMPONENTS.map((componentName) => (
              <span
                key={componentName}
                className="rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-[11px] font-mono text-muted-foreground"
              >
                {componentName}
              </span>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[460px_minmax(0,1fr)]">
            <Card className="min-h-[760px] gap-0 overflow-hidden py-0">
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="text-base">Spec Editor</CardTitle>
                <CardDescription>
                  Edit the Flutter sample spec directly. The preview, runtime
                  state, and generated Dart all update from this tree.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-0">
                <JsonEditor
                  value={editorValue}
                  onChange={(value) =>
                    startTransition(() => {
                      setEditorValue(value);
                    })
                  }
                  sidebarOpen={false}
                  height="100%"
                  className="h-full min-h-[640px]"
                  style={JSON_EDITOR_STYLE}
                />
              </CardContent>
            </Card>

            <Tabs defaultValue="preview" className="min-w-0">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <TabsList className="w-fit">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="export">Export</TabsTrigger>
                  <TabsTrigger value="state">State</TabsTrigger>
                </TabsList>
                <div className="text-xs text-muted-foreground">
                  Mirror preview is approximate. Generated Dart remains the
                  authoritative export.
                </div>
              </div>

              <TabsContent value="preview" className="mt-0">
                <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
                  <Card className="overflow-hidden py-0">
                    <CardHeader className="border-b border-border px-5 py-4">
                      <CardTitle className="text-base">Visual Mirror</CardTitle>
                      <CardDescription>
                        Web approximation of the Flutter-supported component
                        subset, framed like a phone so layout issues show up
                        faster.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="bg-[radial-gradient(circle_at_top,_var(--muted)_0%,_transparent_58%)] px-6 py-8">
                      {parsedSpec ? (
                        <div className="mx-auto w-full max-w-[408px] rounded-[2.25rem] border border-border/80 bg-background p-3 shadow-xl shadow-black/5">
                          <div className="mb-3 flex justify-center">
                            <div className="h-1.5 w-16 rounded-full bg-muted-foreground/25" />
                          </div>
                          <div className="h-[760px] overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.7)_0%,_transparent_18%),linear-gradient(180deg,_var(--background)_0%,_color-mix(in_oklab,_var(--muted)_28%,_var(--background))_100%)]">
                            <div className="h-full overflow-y-auto">
                              <FlutterMirrorRenderer
                                spec={parsedSpec}
                                state={runtimeState}
                                setState={setRuntimeState}
                                onAction={handleAction}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-sm text-muted-foreground">
                          Spec structure is invalid. Keep <code>root</code> and
                          <code> elements</code> present to render the preview.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-5">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Runtime State
                        </CardTitle>
                        <CardDescription>
                          Input bindings, toggles, sliders, and repeated item
                          edits write back here.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="overflow-hidden rounded-2xl border border-border/80">
                          <CodeBlock
                            code={runtimeStateJson}
                            lang="json"
                            fillHeight
                            hideCopyButton
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Action Log</CardTitle>
                        <CardDescription>
                          Custom actions are logged here so you can verify event
                          payloads without launching Flutter.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {actionLog.length > 0 ? (
                          actionLog.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-2xl border border-border/80 px-4 py-3"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="font-mono text-xs text-foreground">
                                  {entry.action}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {entry.timestamp}
                                </div>
                              </div>
                              <div className="overflow-hidden rounded-xl border border-border/70">
                                <CodeBlock
                                  code={JSON.stringify(entry.params, null, 2)}
                                  lang="json"
                                  fillHeight
                                  hideCopyButton
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                            Trigger a button or change a bound control to record
                            action payloads here.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="export" className="mt-0">
                <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="flex flex-col gap-5">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Export Settings
                        </CardTitle>
                        <CardDescription>
                          Tune the generated class name, app metadata, and
                          widget path before exporting files.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-foreground">
                            Widget class
                          </span>
                          <Input
                            value={exportOptions.className}
                            onChange={(event) =>
                              updateExportOption(
                                "className",
                                event.target.value,
                              )
                            }
                            placeholder="FlutterPreviewPage"
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-foreground">
                            Widget file path
                          </span>
                          <Input
                            value={exportOptions.widgetFilePath}
                            onChange={(event) =>
                              updateExportOption(
                                "widgetFilePath",
                                event.target.value,
                              )
                            }
                            placeholder="lib/generated_json_render.dart"
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-foreground">
                            App title
                          </span>
                          <Input
                            value={exportOptions.appTitle}
                            onChange={(event) =>
                              updateExportOption("appTitle", event.target.value)
                            }
                            placeholder="json-render Flutter Preview"
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-foreground">
                            Package name
                          </span>
                          <Input
                            value={exportOptions.packageName}
                            onChange={(event) =>
                              updateExportOption(
                                "packageName",
                                event.target.value,
                              )
                            }
                            placeholder="json_render_flutter_preview"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetExportOptions}
                          >
                            Reset export settings
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={downloadWidgetFile}
                            disabled={!generation.file}
                          >
                            Download widget file
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={downloadProjectBundle}
                            disabled={generation.projectFiles.length === 0}
                          >
                            Download project bundle
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={writeToRepo}
                            disabled={!parsedSpec || isWritingToRepo}
                          >
                            {isWritingToRepo
                              ? "Writing to repo..."
                              : "Write to examples/flutter"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Export Summary
                        </CardTitle>
                        <CardDescription>
                          Current generator outputs for this spec and config.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                        <div className="rounded-2xl border border-border/80 px-4 py-3">
                          <div className="mb-1 font-mono text-xs text-foreground">
                            Widget file
                          </div>
                          <div>{generation.file?.path ?? "Unavailable"}</div>
                        </div>
                        <div className="rounded-2xl border border-border/80 px-4 py-3">
                          <div className="mb-1 font-mono text-xs text-foreground">
                            Project files
                          </div>
                          <div>{generation.projectFiles.length} generated</div>
                        </div>
                        <div className="rounded-2xl border border-border/80 px-4 py-3">
                          <div className="mb-1 font-mono text-xs text-foreground">
                            Package ID
                          </div>
                          <div>{effectiveExportOptions.packageName}</div>
                        </div>
                        <div className="rounded-2xl border border-border/80 px-4 py-3">
                          <div className="mb-1 font-mono text-xs text-foreground">
                            Repo write-back
                          </div>
                          <div>
                            Target: <code>examples/flutter</code>
                          </div>
                          {lastRepoWrite ? (
                            <div className="mt-2 text-xs">
                              Last write at {lastRepoWrite.timestamp}
                            </div>
                          ) : (
                            <div className="mt-2 text-xs">
                              No repo write has been run from this session yet.
                            </div>
                          )}
                        </div>
                        <p>
                          The widget file is the smallest handoff. The project
                          scaffold adds <code>pubspec.yaml</code> and
                          <code> lib/main.dart</code> so you can run it as a
                          standalone sample immediately.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex flex-col gap-5">
                    <Card className="overflow-hidden py-0">
                      <CardHeader className="border-b border-border px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">
                              {generation.file?.path ?? "Generated Dart"}
                            </CardTitle>
                            <CardDescription>
                              Deterministic output from{" "}
                              <code>generateFlutterWidgetFile</code>.
                            </CardDescription>
                          </div>
                          {generation.file ? (
                            <CopyButton
                              text={generation.file.content}
                              className="text-muted-foreground"
                            />
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="min-h-0 flex-1 p-0">
                        {generation.file ? (
                          <div className="max-h-[420px] overflow-auto">
                            <CodeBlock
                              code={generation.file.content}
                              lang="dart"
                              fillHeight
                            />
                          </div>
                        ) : (
                          <div className="px-5 py-6 text-sm text-destructive">
                            {generation.error}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden py-0">
                      <CardHeader className="border-b border-border px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">
                              Project Scaffold
                            </CardTitle>
                            <CardDescription>
                              Browse the generated Flutter project files and
                              download the selected file or the whole bundle.
                            </CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={downloadCurrentProjectFile}
                              disabled={!selectedProjectFile}
                            >
                              Download selected file
                            </Button>
                            <CopyButton
                              text={selectedProjectFileContent}
                              className="text-muted-foreground"
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {generation.projectFiles.map((file) => (
                            <button
                              key={file.path}
                              type="button"
                              onClick={() => setSelectedProjectFile(file.path)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-mono transition-colors",
                                selectedProjectFile === file.path
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {file.path}
                            </button>
                          ))}
                        </div>
                        {selectedProjectFileContent ? (
                          <div className="overflow-hidden rounded-2xl border border-border/80">
                            <div className="border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">
                              {selectedProjectFile}
                            </div>
                            <div className="max-h-[420px] overflow-auto">
                              <CodeBlock
                                code={selectedProjectFileContent}
                                lang={
                                  selectedProjectFile?.endsWith(".yaml")
                                    ? "yaml"
                                    : "dart"
                                }
                                fillHeight
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                            Select a generated project file to inspect it here.
                          </div>
                        )}
                        {lastRepoWrite ? (
                          <div className="rounded-2xl border border-border/80 px-4 py-4">
                            <div className="mb-2 text-sm font-medium text-foreground">
                              Last repo write
                            </div>
                            <div className="mb-3 text-xs text-muted-foreground">
                              {lastRepoWrite.targetRoot} at{" "}
                              {lastRepoWrite.timestamp}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {lastRepoWrite.writtenFiles.map((filePath) => (
                                <span
                                  key={filePath}
                                  className="rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-[11px] font-mono text-muted-foreground"
                                >
                                  {filePath}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="state" className="mt-0">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <Card className="overflow-hidden py-0">
                    <CardHeader className="border-b border-border px-5 py-4">
                      <CardTitle className="text-base">
                        Live State JSON
                      </CardTitle>
                      <CardDescription>
                        Current state snapshot after bindings and preview
                        interactions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[690px] overflow-auto">
                        <CodeBlock
                          code={runtimeStateJson}
                          lang="json"
                          fillHeight
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Review Notes</CardTitle>
                      <CardDescription>
                        Keep these differences in mind while reviewing.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                      <p>
                        The mirror renderer follows the Flutter exporter&apos;s
                        state, repeat, visibility, and action semantics, but it
                        still renders with web primitives.
                      </p>
                      <p>
                        Spacing, typography, and control chrome will differ from
                        Material widgets. Use this page to catch structural
                        issues, then use the real sample app for final Flutter
                        polish.
                      </p>
                      <p>
                        If the preview and generated Dart disagree, treat the
                        Dart output as the source of truth and tighten the
                        mirror mapping.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </>
  );
}
