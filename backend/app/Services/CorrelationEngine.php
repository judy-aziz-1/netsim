<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\SecurityEvent;

class CorrelationEngine
{
    private const WINDOW_SECONDS = 60;

    private const THRESHOLD = 3;

    public static function correlate(SecurityEvent $event): void
    {
        if ($event->eventType !== 'arp_spoof') {
            return;
        }

        $windowStart = $event->created_at->copy()->subSeconds(self::WINDOW_SECONDS);

        $matches = SecurityEvent::where('eventType', 'arp_spoof')
            ->where('victimDeviceId', $event->victimDeviceId)
            ->whereBetween('created_at', [$windowStart, $event->created_at])
            ->get();

        if ($matches->count() < self::THRESHOLD) {
            return;
        }

        $matchedIds = $matches->pluck('id')->all();

        $existingAlert = Alert::where('ruleName', 'repeated_arp_spoof')
            ->where('victimDeviceId', $event->victimDeviceId)
            ->where('status', 'open')
            ->first();

        if ($existingAlert) {
            $relatedEventIds = array_values(array_unique([
                ...$existingAlert->relatedEventIds,
                ...$matchedIds,
            ]));

            $existingAlert->relatedEventIds = $relatedEventIds;
            $existingAlert->eventCount = count($relatedEventIds);
            $existingAlert->description = sprintf(
                'Repeated ARP spoofing detected against %s (%d events within %ds)',
                $event->victimDeviceId,
                count($relatedEventIds),
                self::WINDOW_SECONDS,
            );
            $existingAlert->save();

            return;
        }

        Alert::create([
            'ruleName' => 'repeated_arp_spoof',
            'severity' => 'high',
            'victimDeviceId' => $event->victimDeviceId,
            'relatedEventIds' => $matchedIds,
            'eventCount' => count($matchedIds),
            'description' => sprintf(
                'Repeated ARP spoofing detected against %s (%d events within %ds)',
                $event->victimDeviceId,
                count($matchedIds),
                self::WINDOW_SECONDS,
            ),
            'status' => 'open',
        ]);
    }
}
