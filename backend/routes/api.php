<?php

use App\Http\Controllers\AlertController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\IncidentTicketController;
use App\Http\Controllers\NetworkTopologyController;
use App\Http\Controllers\SecurityEventController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Route::get('/user', function (Request $request) {
//     return $request->user();
// })->middleware('auth:sanctum');

// Route::post('/register', [AuthController::class, 'register']);
// Route::post('/login', [AuthController::class, 'login']);
// Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::get('/network-topologies', [NetworkTopologyController::class, 'index']);
Route::post('/network-topologies', [NetworkTopologyController::class, 'store']);
Route::delete('/network-topologies/{id}', [NetworkTopologyController::class, 'destroy']);

Route::get('/security-events', [SecurityEventController::class, 'index']);
Route::post('/security-events', [SecurityEventController::class, 'store']);

Route::get('/alerts', [AlertController::class, 'index']);

Route::get('/incident-tickets', [IncidentTicketController::class, 'index']);
Route::post('/incident-tickets', [IncidentTicketController::class, 'store']);
Route::get('/incident-tickets/{id}', [IncidentTicketController::class, 'show']);
Route::patch('/incident-tickets/{id}/status', [IncidentTicketController::class, 'updateStatus']);
