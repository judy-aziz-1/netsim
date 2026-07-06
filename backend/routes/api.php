<?php

use App\Http\Controllers\NetworkTopologyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/network-topologies', [NetworkTopologyController::class, 'index']);
Route::post('/network-topologies', [NetworkTopologyController::class, 'store']);
