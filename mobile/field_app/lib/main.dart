import 'package:flutter/material.dart';

/// Placeholder entrypoint. Configure Supabase URL + anon key via --dart-define or env,
/// then implement Citizen / JE / Contractor flows per implementation plan.
void main() {
  runApp(const RoadNirmanFieldApp());
}

class RoadNirmanFieldApp extends StatelessWidget {
  const RoadNirmanFieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Road Nirman Field',
      home: Scaffold(
        appBar: AppBar(title: const Text('Road Nirman Field')),
        body: const Center(
          child: Text('Flutter field track — connect Supabase and implement flows.'),
        ),
      ),
    );
  }
}
