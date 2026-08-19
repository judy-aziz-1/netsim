<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class NetworkTopology extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'network_topologies';

    protected $fillable = ['name', 'data'];
}
