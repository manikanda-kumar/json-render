import 'package:flutter/material.dart';
import 'generated_json_render.dart';

void main() {
  runApp(const GeneratedJsonRenderApp());
}

class GeneratedJsonRenderApp extends StatelessWidget {
  const GeneratedJsonRenderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'json-render Flutter Example',
      home: Scaffold(
        appBar: AppBar(title: const Text('json-render Flutter Example')),
        body: const SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: ProfileDashboardPage(),
        ),
      ),
    );
  }
}
