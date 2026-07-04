<?php

use App\Http\Controllers\NetworkTopologyController;
use Illuminate\Support\Facades\Route;

Route::get('/network-topologies', [NetworkTopologyController::class, 'index']);
Route::post('/network-topologies', [NetworkTopologyController::class, 'store']);
