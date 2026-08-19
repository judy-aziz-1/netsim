<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Alert extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'alerts';

    protected $fillable = [
        'ruleName',
        'severity',
        'victimDeviceId',
        'victimDeviceName',
        'relatedEventIds',
        'eventCount',
        'description',
        'status',
    ];
}
