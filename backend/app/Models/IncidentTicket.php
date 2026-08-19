<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class IncidentTicket extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'incident_tickets';

    protected $fillable = [
        'title',
        'description',
        'status',
        'relatedAlertId',
        'assignedTo',
        'auditLog',
        'origin',
        'deviceName',
    ];
}
