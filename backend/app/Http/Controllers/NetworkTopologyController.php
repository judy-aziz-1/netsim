<?php

namespace App\Http\Controllers;

use App\Models\NetworkTopology;
use Illuminate\Http\Request;

class NetworkTopologyController extends Controller
{
    public function index()
    {
        return NetworkTopology::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'data' => 'required',
        ]);

        $topology = NetworkTopology::create($validated);

        return response()->json($topology, 201);
    }
}
