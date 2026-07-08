<?php

namespace App\Http\Controllers;

use App\Models\Alert;

class AlertController extends Controller
{
    public function index()
    {
        return Alert::orderBy('created_at', 'desc')->get();
    }
}
