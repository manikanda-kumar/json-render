import 'dart:convert';
import 'package:flutter/material.dart';

typedef JsonRenderActionHandler = Future<void> Function(
  String action,
  Map<String, dynamic> params,
);

final Map<String, dynamic> _generatedSpec =
    jsonDecode(_generatedSpecJson) as Map<String, dynamic>;

const String _generatedSpecJson = r'''{
  "root": "screen",
  "state": {
    "profile": {
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "role": "Engineer"
    },
    "stats": [
      {
        "label": "Projects",
        "value": "12",
        "highlighted": true
      },
      {
        "label": "Reports",
        "value": "38",
        "highlighted": false
      },
      {
        "label": "Alerts",
        "value": "3",
        "highlighted": true
      }
    ]
  },
  "elements": {
    "screen": {
      "type": "SafeArea",
      "props": {},
      "children": [
        "content"
      ]
    },
    "content": {
      "type": "ScrollContainer",
      "props": {},
      "children": [
        "stack"
      ]
    },
    "stack": {
      "type": "Column",
      "props": {
        "gap": 16
      },
      "children": [
        "hero",
        "stats-list",
        "email-field",
        "save-button"
      ]
    },
    "hero": {
      "type": "Card",
      "props": {
        "padding": 16
      },
      "children": [
        "title",
        "subtitle"
      ]
    },
    "title": {
      "type": "Heading",
      "props": {
        "text": {
          "$template": "Hello ${/profile/name}"
        },
        "level": 2
      }
    },
    "subtitle": {
      "type": "Paragraph",
      "props": {
        "text": {
          "$template": "Role: ${/profile/role}"
        }
      }
    },
    "stats-list": {
      "type": "Column",
      "props": {
        "gap": 8
      },
      "repeat": {
        "statePath": "/stats"
      },
      "children": [
        "stat-row"
      ]
    },
    "stat-row": {
      "type": "Row",
      "props": {
        "gap": 12
      },
      "children": [
        "stat-label",
        "stat-value"
      ]
    },
    "stat-label": {
      "type": "Text",
      "props": {
        "text": {
          "$item": "label"
        }
      }
    },
    "stat-value": {
      "type": "Chip",
      "props": {
        "label": {
          "$item": "value"
        }
      },
      "visible": {
        "$item": "highlighted",
        "eq": true
      }
    },
    "email-field": {
      "type": "TextInput",
      "props": {
        "label": "Email",
        "value": {
          "$bindState": "/profile/email"
        },
        "placeholder": "Enter email"
      }
    },
    "save-button": {
      "type": "Button",
      "props": {
        "label": "Save profile"
      },
      "on": {
        "press": {
          "action": "saveProfile",
          "params": {
            "email": {
              "$state": "/profile/email"
            },
            "name": {
              "$state": "/profile/name"
            }
          }
        }
      }
    }
  }
}''';

class ProfileDashboardPage extends StatefulWidget {
  const ProfileDashboardPage({
    super.key,
    this.initialState = const {},
    this.onAction,
  });

  final Map<String, dynamic> initialState;
  final JsonRenderActionHandler? onAction;

  @override
  State<ProfileDashboardPage> createState() => _ProfileDashboardPageState();
}

class _ProfileDashboardPageState extends State<ProfileDashboardPage> {
  late final Map<String, dynamic> _elements;
  late final String _rootKey;
  late final Map<String, dynamic> _state;

  @override
  void initState() {
    super.initState();
    _elements = (_generatedSpec['elements'] as Map<String, dynamic>? ?? const {})
        .cast<String, dynamic>();
    _rootKey = (_generatedSpec['root'] as String?) ?? '';
    _state = <String, dynamic>{
      ...(_generatedSpec['state'] as Map<String, dynamic>? ?? const {}),
      ...widget.initialState,
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_rootKey.isEmpty) {
      return const SizedBox.shrink();
    }

    return _buildElement(_rootKey);
  }

  Widget _buildElement(
    String key, {
    Object? repeatItem,
    int? repeatIndex,
    String? repeatBasePath,
    bool ignoreRepeat = false,
  }) {
    final rawElement = _elements[key];
    if (rawElement is! Map<String, dynamic>) {
      return const SizedBox.shrink();
    }

    if (!_evaluateVisibility(
      rawElement['visible'],
      repeatItem: repeatItem,
      repeatIndex: repeatIndex,
    )) {
      return const SizedBox.shrink();
    }

    final repeat = rawElement['repeat'];
    if (!ignoreRepeat && repeat is Map<String, dynamic>) {
      final statePath = repeat['statePath'];
      if (statePath is String) {
        final items = _getByPath(_state, statePath);
        if (items is List) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = 0; index < items.length; index++)
                _buildElement(
                  key,
                  repeatItem: items[index],
                  repeatIndex: index,
                  repeatBasePath: _joinJsonPath(statePath, '$index'),
                  ignoreRepeat: true,
                ),
            ],
          );
        }
      }

      return const SizedBox.shrink();
    }

    final props = _resolveProps(
      rawElement['props'] as Map<String, dynamic>? ?? const {},
      repeatItem: repeatItem,
      repeatIndex: repeatIndex,
      repeatBasePath: repeatBasePath,
    );
    final children = _buildChildren(
      rawElement['children'] as List<dynamic>? ?? const [],
      repeatItem: repeatItem,
      repeatIndex: repeatIndex,
      repeatBasePath: repeatBasePath,
    );

    return _renderElement(
      rawElement['type'] as String? ?? 'Unknown',
      rawElement,
      props,
      children,
      repeatItem: repeatItem,
      repeatIndex: repeatIndex,
      repeatBasePath: repeatBasePath,
    );
  }

  List<Widget> _buildChildren(
    List<dynamic> childKeys, {
    Object? repeatItem,
    int? repeatIndex,
    String? repeatBasePath,
  }) {
    return childKeys
        .whereType<String>()
        .map(
          (childKey) => _buildElement(
            childKey,
            repeatItem: repeatItem,
            repeatIndex: repeatIndex,
            repeatBasePath: repeatBasePath,
          ),
        )
        .toList();
  }

  Widget _renderElement(
    String type,
    Map<String, dynamic> rawElement,
    Map<String, dynamic> props,
    List<Widget> children, {
    Object? repeatItem,
    int? repeatIndex,
    String? repeatBasePath,
  }) {
    switch (type) {
      case 'SafeArea':
        return SafeArea(child: _singleChild(children));
      case 'ScrollContainer':
        final direction =
            props['direction'] == 'horizontal' ? Axis.horizontal : Axis.vertical;
        return SingleChildScrollView(
          scrollDirection: direction,
          child: direction == Axis.horizontal
              ? Row(mainAxisSize: MainAxisSize.min, children: children)
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: children,
                ),
        );
      case 'Row':
        return Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: _mainAxisAlignment(props['justify']),
          crossAxisAlignment: _crossAxisAlignment(props['align']),
          children: _withGap(children, props['gap']),
        );
      case 'Column':
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: _crossAxisAlignment(props['align']),
          children: _withGap(children, props['gap']),
        );
      case 'Container':
        return Container(
          width: _toDouble(props['width']),
          height: _toDouble(props['height']),
          padding: _edgeInsets(props['padding']),
          margin: _edgeInsets(props['margin']),
          alignment: _alignment(props['alignment']),
          decoration: BoxDecoration(
            color: _color(props['backgroundColor'] ?? props['color']),
            borderRadius: _borderRadius(props['borderRadius']),
          ),
          child: _singleChild(children),
        );
      case 'Card':
        return Card(
          child: Padding(
            padding: _edgeInsets(props['padding']) ?? const EdgeInsets.all(16),
            child: children.isEmpty
                ? _textWidget(_firstText(props), style: const TextStyle(fontSize: 16))
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: _withGap(children, props['gap'] ?? 12),
                  ),
          ),
        );
      case 'Heading':
        return _textWidget(
          _firstText(props),
          style: TextStyle(
            fontSize: _headingFontSize(props['level']),
            fontWeight: FontWeight.w700,
          ),
        );
      case 'Paragraph':
      case 'Label':
      case 'Text':
        return _textWidget(
          _firstText(props),
          style: TextStyle(fontSize: _toDouble(props['fontSize']) ?? 14),
        );
      case 'Button':
        final binding = _extractActionBinding(rawElement);
        return ElevatedButton(
          onPressed: binding == null
              ? null
              : () => _executeActionBinding(
                    binding,
                    repeatItem: repeatItem,
                    repeatIndex: repeatIndex,
                    repeatBasePath: repeatBasePath,
                  ),
          child: Text(_firstText(props, fallback: 'Button')),
        );
      case 'Pressable':
        final binding = _extractActionBinding(rawElement);
        final child = _singleChild(children);
        return InkWell(
          onTap: binding == null
              ? null
              : () => _executeActionBinding(
                    binding,
                    repeatItem: repeatItem,
                    repeatIndex: repeatIndex,
                    repeatBasePath: repeatBasePath,
                  ),
          child: child,
        );
      case 'Image':
      case 'Avatar':
        final imageUrl = props['src'] ?? props['url'] ?? props['imageUrl'];
        if (imageUrl is String && imageUrl.isNotEmpty) {
          return ClipRRect(
            borderRadius: type == 'Avatar'
                ? BorderRadius.circular(999)
                : _borderRadius(props['borderRadius']) ?? BorderRadius.zero,
            child: Image.network(
              imageUrl,
              width: _toDouble(props['width']),
              height: _toDouble(props['height']),
              fit: BoxFit.cover,
            ),
          );
        }
        return const SizedBox.shrink();
      case 'Divider':
        return Divider(height: _toDouble(props['height']) ?? 1);
      case 'Spacer':
        final flex = _toInt(props['flex']);
        if (flex != null && flex > 0) {
          return Expanded(flex: flex, child: const SizedBox.shrink());
        }
        final size = _toDouble(props['size']) ?? _toDouble(props['height']) ?? 8;
        return SizedBox(height: size, width: size);
      case 'Badge':
      case 'Chip':
        return Chip(label: Text(_firstText(props, fallback: type)));
      case 'TextInput':
      case 'SearchBar':
        final valuePath = _resolveBindingPath(
          rawElement['props'] is Map<String, dynamic>
              ? (rawElement['props'] as Map<String, dynamic>)['value']
              : null,
          repeatBasePath: repeatBasePath,
        );
        return TextFormField(
          initialValue: (props['value'] ?? props['defaultValue'])?.toString(),
          decoration: InputDecoration(
            labelText: _stringOrNull(props['label']),
            hintText: _stringOrNull(props['placeholder']),
            prefixIcon: type == 'SearchBar' ? const Icon(Icons.search) : null,
            border: const OutlineInputBorder(),
          ),
          onChanged: valuePath == null
              ? null
              : (value) => setState(() => _setByPath(_state, valuePath, value)),
        );
      case 'Switch':
        final valuePath = _resolveBindingPath(
          rawElement['props'] is Map<String, dynamic>
              ? (rawElement['props'] as Map<String, dynamic>)['value']
              : null,
          repeatBasePath: repeatBasePath,
        );
        return SwitchListTile(
          value: props['value'] == true,
          title: Text(_firstText(props, fallback: 'Switch')),
          onChanged: valuePath == null
              ? null
              : (value) => setState(() => _setByPath(_state, valuePath, value)),
        );
      case 'Checkbox':
        final valuePath = _resolveBindingPath(
          rawElement['props'] is Map<String, dynamic>
              ? (rawElement['props'] as Map<String, dynamic>)['checked']
              : null,
          repeatBasePath: repeatBasePath,
        );
        return CheckboxListTile(
          value: props['checked'] == true,
          title: Text(_firstText(props, fallback: 'Checkbox')),
          onChanged: valuePath == null
              ? null
              : (value) => setState(
                    () => _setByPath(_state, valuePath, value ?? false),
                  ),
        );
      case 'Slider':
        final valuePath = _resolveBindingPath(
          rawElement['props'] is Map<String, dynamic>
              ? (rawElement['props'] as Map<String, dynamic>)['value']
              : null,
          repeatBasePath: repeatBasePath,
        );
        final currentValue = _toDouble(props['value']) ?? _toDouble(props['min']) ?? 0;
        return Slider(
          value: currentValue,
          min: _toDouble(props['min']) ?? 0,
          max: _toDouble(props['max']) ?? 100,
          onChanged: valuePath == null
              ? null
              : (value) => setState(() => _setByPath(_state, valuePath, value)),
        );
      default:
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade400),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Unsupported component: $type',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              if (_firstText(props).isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(_firstText(props)),
                ),
              if (children.isNotEmpty) ...[
                const SizedBox(height: 12),
                ...children,
              ],
            ],
          ),
        );
    }
  }

  Widget _singleChild(List<Widget> children) {
    if (children.isEmpty) {
      return const SizedBox.shrink();
    }
    if (children.length == 1) {
      return children.first;
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );
  }

  List<Widget> _withGap(List<Widget> children, Object? gapValue) {
    final gap = _toDouble(gapValue);
    if (gap == null || children.length < 2) {
      return children;
    }

    final spaced = <Widget>[];
    for (var index = 0; index < children.length; index++) {
      if (index > 0) {
        spaced.add(SizedBox(width: gap, height: gap));
      }
      spaced.add(children[index]);
    }
    return spaced;
  }

  Map<String, dynamic> _resolveProps(
    Map<String, dynamic> props, {
    Object? repeatItem,
    int? repeatIndex,
    String? repeatBasePath,
  }) {
    return props.map(
      (key, value) => MapEntry(
        key,
        _resolveValue(
          value,
          repeatItem: repeatItem,
          repeatIndex: repeatIndex,
          repeatBasePath: repeatBasePath,
        ),
      ),
    );
  }

  Object? _resolveValue(
    Object? value, {
    Object? repeatItem,
    int? repeatIndex,
    String? repeatBasePath,
  }) {
    if (value == null) {
      return null;
    }

    if (value is List) {
      return value
          .map(
            (item) => _resolveValue(
              item,
              repeatItem: repeatItem,
              repeatIndex: repeatIndex,
              repeatBasePath: repeatBasePath,
            ),
          )
          .toList();
    }

    if (value is Map<String, dynamic>) {
      if (value.containsKey(r'$state')) {
        final path = value[r'$state'];
        return path is String ? _getByPath(_state, path) : null;
      }

      if (value.containsKey(r'$item')) {
        final path = value[r'$item'];
        if (path is! String) {
          return null;
        }
        if (path.isEmpty) {
          return repeatItem;
        }
        return _getByPath(repeatItem, path);
      }

      if (value.containsKey(r'$index')) {
        return repeatIndex;
      }

      if (value.containsKey(r'$bindState')) {
        final path = value[r'$bindState'];
        return path is String ? _getByPath(_state, path) : null;
      }

      if (value.containsKey(r'$bindItem')) {
        final path = _resolveBindingPath(
          value,
          repeatBasePath: repeatBasePath,
        );
        return path == null ? null : _getByPath(_state, path);
      }

      if (value.containsKey(r'$cond')) {
        final showThen = _evaluateVisibility(
          value[r'$cond'],
          repeatItem: repeatItem,
          repeatIndex: repeatIndex,
        );
        return _resolveValue(
          showThen ? value[r'$then'] : value[r'$else'],
          repeatItem: repeatItem,
          repeatIndex: repeatIndex,
          repeatBasePath: repeatBasePath,
        );
      }

      if (value.containsKey(r'$template')) {
        final template = value[r'$template'];
        if (template is! String) {
          return null;
        }

        return template.replaceAllMapped(
          RegExp(r'\$\{([^}]+)\}'),
          (match) {
            final path = match.group(1) ?? '';
            final normalizedPath = path.startsWith('/') ? path : '/$path';
            final resolved = _getByPath(_state, normalizedPath);
            return resolved?.toString() ?? '';
          },
        );
      }

      return value.map(
        (key, nestedValue) => MapEntry(
          key,
          _resolveValue(
            nestedValue,
            repeatItem: repeatItem,
            repeatIndex: repeatIndex,
            repeatBasePath: repeatBasePath,
          ),
        ),
      );
    }

    return value;
  }

  bool _evaluateVisibility(
    Object? condition, {
    Object? repeatItem,
    int? repeatIndex,
  }) {
    if (condition == null) {
      return true;
    }

    if (condition is bool) {
      return condition;
    }

    if (condition is List) {
      return condition.every(
        (item) => _evaluateVisibility(
          item,
          repeatItem: repeatItem,
          repeatIndex: repeatIndex,
        ),
      );
    }

    if (condition is Map<String, dynamic>) {
      if (condition.containsKey(r'$and')) {
        final items = condition[r'$and'];
        return items is List &&
            items.every(
              (item) => _evaluateVisibility(
                item,
                repeatItem: repeatItem,
                repeatIndex: repeatIndex,
              ),
            );
      }

      if (condition.containsKey(r'$or')) {
        final items = condition[r'$or'];
        return items is List &&
            items.any(
              (item) => _evaluateVisibility(
                item,
                repeatItem: repeatItem,
                repeatIndex: repeatIndex,
              ),
            );
      }

      Object? currentValue;
      if (condition.containsKey(r'$state')) {
        final path = condition[r'$state'];
        currentValue = path is String ? _getByPath(_state, path) : null;
      } else if (condition.containsKey(r'$item')) {
        final path = condition[r'$item'];
        if (path is String) {
          currentValue = path.isEmpty ? repeatItem : _getByPath(repeatItem, path);
        }
      } else if (condition.containsKey(r'$index')) {
        currentValue = repeatIndex;
      }

      var result = currentValue == true ||
          (currentValue != null &&
              currentValue is! bool &&
              currentValue.toString().isNotEmpty);

      if (condition.containsKey('eq')) {
        result = currentValue == _resolveComparisonValue(condition['eq']);
      } else if (condition.containsKey('neq')) {
        result = currentValue != _resolveComparisonValue(condition['neq']);
      } else if (condition.containsKey('gt')) {
        final rhs = _toDouble(_resolveComparisonValue(condition['gt']));
        result = _toDouble(currentValue) != null &&
            rhs != null &&
            _toDouble(currentValue)! > rhs;
      } else if (condition.containsKey('gte')) {
        final rhs = _toDouble(_resolveComparisonValue(condition['gte']));
        result = _toDouble(currentValue) != null &&
            rhs != null &&
            _toDouble(currentValue)! >= rhs;
      } else if (condition.containsKey('lt')) {
        final rhs = _toDouble(_resolveComparisonValue(condition['lt']));
        result = _toDouble(currentValue) != null &&
            rhs != null &&
            _toDouble(currentValue)! < rhs;
      } else if (condition.containsKey('lte')) {
        final rhs = _toDouble(_resolveComparisonValue(condition['lte']));
        result = _toDouble(currentValue) != null &&
            rhs != null &&
            _toDouble(currentValue)! <= rhs;
      }

      return condition['not'] == true ? !result : result;
    }

    return true;
  }

  Object? _resolveComparisonValue(Object? value) {
    if (value is Map<String, dynamic> && value.containsKey(r'$state')) {
      final path = value[r'$state'];
      return path is String ? _getByPath(_state, path) : null;
    }
    return value;
  }

  Map<String, dynamic>? _extractActionBinding(Map<String, dynamic> rawElement) {
    final on = rawElement['on'];
    if (on is Map<String, dynamic>) {
      final preferred = on['press'] ?? on['tap'] ?? on['submit'] ?? on['change'];
      if (preferred is Map<String, dynamic>) {
        return preferred;
      }
      if (preferred is List && preferred.isNotEmpty && preferred.first is Map<String, dynamic>) {
        return preferred.first as Map<String, dynamic>;
      }
    }

    final props = rawElement['props'];
    if (props is Map<String, dynamic> && props['action'] is String) {
      return <String, dynamic>{
        'action': props['action'],
        'params': props['actionParams'] is Map<String, dynamic>
            ? props['actionParams']
            : const <String, dynamic>{},
      };
    }

    return null;
  }

  Future<void> _executeActionBinding(
    Map<String, dynamic> binding, {
    Object? repeatItem,
    int? repeatIndex,
    String? repeatBasePath,
  }) async {
    final action = binding['action'];
    if (action is! String || action.isEmpty) {
      return;
    }

    final rawParams = binding['params'] as Map<String, dynamic>? ?? const {};
    final resolvedParams = _resolveProps(
      rawParams,
      repeatItem: repeatItem,
      repeatIndex: repeatIndex,
      repeatBasePath: repeatBasePath,
    );

    if (action == 'setState') {
      final statePath = resolvedParams['statePath'];
      if (statePath is String && statePath.isNotEmpty) {
        setState(() => _setByPath(_state, statePath, resolvedParams['value']));
      }
    }

    if (widget.onAction != null) {
      await widget.onAction!(action, resolvedParams);
    }
  }

  Object? _getByPath(Object? source, String path) {
    if (source == null) {
      return null;
    }
    if (path.isEmpty || path == '/') {
      return source;
    }

    final normalized = path.startsWith('/') ? path.substring(1) : path;
    if (normalized.isEmpty) {
      return source;
    }

    Object? current = source;
    for (final segment in normalized.split('/')) {
      final unescaped = segment.replaceAll('~1', '/').replaceAll('~0', '~');
      if (current is Map) {
        current = current[unescaped];
      } else if (current is List) {
        final index = int.tryParse(unescaped);
        if (index == null || index < 0 || index >= current.length) {
          return null;
        }
        current = current[index];
      } else {
        return null;
      }
    }
    return current;
  }

  void _setByPath(Map<String, dynamic> target, String path, Object? value) {
    final normalized = path.startsWith('/') ? path.substring(1) : path;
    if (normalized.isEmpty) {
      return;
    }

    final segments = normalized
        .split('/')
        .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
        .toList();

    Object? current = target;
    for (var index = 0; index < segments.length - 1; index++) {
      final segment = segments[index];
      final nextSegment = segments[index + 1];
      final nextIsIndex = int.tryParse(nextSegment) != null;

      if (current is Map<String, dynamic>) {
        final existing = current[segment];
        if (existing is Map<String, dynamic> || existing is List<Object?>) {
          current = existing;
          continue;
        }

        current[segment] = nextIsIndex ? <Object?>[] : <String, dynamic>{};
        current = current[segment];
        continue;
      }

      if (current is List<Object?>) {
        final listIndex = int.tryParse(segment);
        if (listIndex == null || listIndex < 0) {
          return;
        }

        while (current.length <= listIndex) {
          current.add(null);
        }

        final existing = current[listIndex];
        if (existing is Map<String, dynamic> || existing is List<Object?>) {
          current = existing;
          continue;
        }

        current[listIndex] = nextIsIndex ? <Object?>[] : <String, dynamic>{};
        current = current[listIndex];
        continue;
      }

      return;
    }

    final lastSegment = segments.last;
    if (current is Map<String, dynamic>) {
      current[lastSegment] = value;
      return;
    }

    if (current is List<Object?>) {
      final listIndex = int.tryParse(lastSegment);
      if (listIndex == null || listIndex < 0) {
        return;
      }

      while (current.length <= listIndex) {
        current.add(null);
      }

      current[listIndex] = value;
    }
  }

  String _joinJsonPath(String basePath, String segment) {
    if (basePath == '/' || basePath.isEmpty) {
      return '/$segment';
    }
    final normalized = basePath.endsWith('/') ? basePath.substring(0, basePath.length - 1) : basePath;
    return '$normalized/$segment';
  }

  double? _toDouble(Object? value) {
    if (value is num) {
      return value.toDouble();
    }
    if (value is String) {
      return double.tryParse(value);
    }
    return null;
  }

  int? _toInt(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value);
    }
    return null;
  }

  String? _stringOrNull(Object? value) {
    return value == null ? null : value.toString();
  }

  String _firstText(Map<String, dynamic> props, {String fallback = ''}) {
    final candidates = [
      props['text'],
      props['label'],
      props['title'],
      props['content'],
      props['value'],
      props['name'],
    ];

    for (final candidate in candidates) {
      if (candidate != null && candidate.toString().isNotEmpty) {
        return candidate.toString();
      }
    }

    return fallback;
  }

  Widget _textWidget(String value, {TextStyle? style}) {
    if (value.isEmpty) {
      return const SizedBox.shrink();
    }
    return Text(value, style: style);
  }

  double _headingFontSize(Object? level) {
    switch (_toInt(level) ?? 2) {
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

  EdgeInsets? _edgeInsets(Object? value) {
    if (value is num) {
      return EdgeInsets.all(value.toDouble());
    }
    if (value is Map<String, dynamic>) {
      return EdgeInsets.only(
        left: _toDouble(value['left']) ?? 0,
        top: _toDouble(value['top']) ?? 0,
        right: _toDouble(value['right']) ?? 0,
        bottom: _toDouble(value['bottom']) ?? 0,
      );
    }
    return null;
  }

  Alignment? _alignment(Object? value) {
    switch (value?.toString()) {
      case 'center':
        return Alignment.center;
      case 'topLeft':
        return Alignment.topLeft;
      case 'topRight':
        return Alignment.topRight;
      case 'bottomLeft':
        return Alignment.bottomLeft;
      case 'bottomRight':
        return Alignment.bottomRight;
      default:
        return null;
    }
  }

  BorderRadius? _borderRadius(Object? value) {
    final radius = _toDouble(value);
    if (radius == null) {
      return null;
    }
    return BorderRadius.circular(radius);
  }

  Color? _color(Object? value) {
    if (value is! String) {
      return null;
    }

    final hex = value.replaceFirst('#', '');
    if (hex.length != 6 && hex.length != 8) {
      return null;
    }

    final normalized = hex.length == 6 ? 'FF$hex' : hex;
    final parsed = int.tryParse(normalized, radix: 16);
    return parsed == null ? null : Color(parsed);
  }

  MainAxisAlignment _mainAxisAlignment(Object? value) {
    switch (value?.toString()) {
      case 'center':
        return MainAxisAlignment.center;
      case 'end':
        return MainAxisAlignment.end;
      case 'spaceBetween':
        return MainAxisAlignment.spaceBetween;
      case 'spaceAround':
        return MainAxisAlignment.spaceAround;
      case 'spaceEvenly':
        return MainAxisAlignment.spaceEvenly;
      default:
        return MainAxisAlignment.start;
    }
  }

  CrossAxisAlignment _crossAxisAlignment(Object? value) {
    switch (value?.toString()) {
      case 'center':
        return CrossAxisAlignment.center;
      case 'end':
        return CrossAxisAlignment.end;
      case 'stretch':
        return CrossAxisAlignment.stretch;
      default:
        return CrossAxisAlignment.start;
    }
  }

  String? _resolveBindingPath(
    Object? value, {
    String? repeatBasePath,
  }) {
    if (value is Map<String, dynamic>) {
      if (value.containsKey(r'$bindState')) {
        final path = value[r'$bindState'];
        return path is String ? path : null;
      }

      if (value.containsKey(r'$bindItem')) {
        final path = value[r'$bindItem'];
        if (path is! String || repeatBasePath == null) {
          return null;
        }
        return path.isEmpty ? repeatBasePath : _joinJsonPath(repeatBasePath, path);
      }
    }

    return null;
  }
}
