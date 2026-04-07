import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { FlutterPreview } from "@/components/flutter-preview";
import { pageMetadata } from "@/lib/page-metadata";
import type { Spec } from "@json-render/core";

export const metadata = pageMetadata("flutter-preview");

export default async function FlutterPreviewPage() {
  const rawSpec = await readFile(
    fileURLToPath(
      new URL("../../../../examples/flutter/spec.json", import.meta.url),
    ),
    "utf-8",
  );

  const initialSpec = JSON.parse(rawSpec) as Spec;

  return <FlutterPreview initialSpec={initialSpec} />;
}
