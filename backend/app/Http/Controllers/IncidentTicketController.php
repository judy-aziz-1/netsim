<?php

namespace App\Http\Controllers;

use App\Models\IncidentTicket;
use Illuminate\Http\Request;

class IncidentTicketController extends Controller
{
    public function index()
    {
        return IncidentTicket::orderBy('created_at', 'desc')->get();
    }

    public function show($id)
    {
        return IncidentTicket::findOrFail($id);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'relatedAlertId' => 'nullable|string',
            'assignedTo' => 'nullable|string',
        ]);

        $validated['status'] = 'open';
        $validated['auditLog'] = [[
            'timestamp' => now()->toIso8601String(),
            'action' => 'created',
            'note' => 'Ticket opened',
        ]];

        $ticket = IncidentTicket::create($validated);

        return response()->json($ticket, 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:open,investigating,closed',
            'note' => 'nullable|string',
        ]);

        $ticket = IncidentTicket::findOrFail($id);

        $auditLog = $ticket->auditLog ?? [];
        $auditLog[] = [
            'timestamp' => now()->toIso8601String(),
            'action' => 'status_changed',
            'note' => "{$ticket->status} → {$validated['status']}: " . ($validated['note'] ?? ''),
        ];

        $ticket->status = $validated['status'];
        $ticket->auditLog = $auditLog;
        $ticket->save();

        return response()->json($ticket);
    }
}
