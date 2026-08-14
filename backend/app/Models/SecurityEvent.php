<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class SecurityEvent extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'security_events';

    protected $fillable = [
        'eventType',
        'attackerDeviceId',
        'victimDeviceId',
        'impersonatedDeviceId',
        'attackerDeviceName',
        'victimDeviceName',
        'impersonatedDeviceName',
        'details',
    ];
}
