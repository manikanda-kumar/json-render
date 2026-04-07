# Flutter Example

This folder contains a sample Flutter app generated from a json-render spec using `@json-render/flutter`.

For faster authoring and review, use the web app route at `/flutter-preview`. It loads this example spec, mirrors the supported Flutter component subset in the browser, lets you tune export settings, shows both the generated Dart widget file and the generated Flutter project scaffold, and can write the current export back into `examples/flutter`.

## Files

- `spec.json` — source json-render spec
- `pubspec.yaml` — Flutter package definition
- `lib/main.dart` — Flutter app scaffold
- `lib/generated_json_render.dart` — generated Dart widget interpreter plus embedded spec

## Verification

Preferred:

```bash
cd examples/flutter
flutter pub get
flutter analyze
```

If you only want to check formatting without the Flutter wrapper:

```bash
/opt/homebrew/share/flutter/bin/cache/dart-sdk/bin/dart format --output=none lib
```

## Model Comparison

Compare Gemini 2.5 Pro and GPT-5.4 on the same spec through OpenRouter:

```bash
node examples/flutter/compare-models.mjs
```

Outputs are written to `/tmp/json-render-flutter-model-compare`.
