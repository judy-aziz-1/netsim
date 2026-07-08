<?php

namespace App\Http\Controllers;

use App\Models\SecurityEvent;
use Illuminate\Http\Request;

class SecurityEventController extends Controller
{
    public function index()
    {
        return SecurityEvent::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'eventType' => 'required|string',
            'attackerDeviceId' => 'nullable|string',
            'victimDeviceId' => 'nullable|string',
            'impersonatedDeviceId' => 'nullable|string',
            'details' => 'nullable',
        ]);

        $event = SecurityEvent::create($validated);

        return response()->json($event, 201);
    }
}
