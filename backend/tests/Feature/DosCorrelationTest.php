<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\IncidentTicket;
use App\Models\SecurityEvent;
use Tests\TestCase;

class DosCorrelationTest extends TestCase
{
    private string $victimDeviceId;

    protected function setUp(): void
    {
        parent::setUp();

        // Unique per run so this test never collides with real dev data in
        // the shared Mongo database, and so tearDown can safely delete only
        // what it created.
        $this->victimDeviceId = 'test-dos-victim-'.uniqid();
    }

    protected function tearDown(): void
    {
        SecurityEvent::where('victimDeviceId', $this->victimDeviceId)->delete();
        Alert::where('victimDeviceId', $this->victimDeviceId)->delete();
        IncidentTicket::where('deviceName', $this->victimDeviceId)->delete();

        parent::tearDown();
    }

    public function test_three_dos_attack_events_within_the_window_create_an_alert_and_ticket(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $response = $this->postJson('/api/security-events', [
                'eventType' => 'dos_attack',
                'attackerDeviceId' => 'device-attacker',
                'victimDeviceId' => $this->victimDeviceId,
                'attackerDeviceName' => 'attacker-1',
                'victimDeviceName' => $this->victimDeviceId,
            ]);

            $response->assertStatus(201);
        }

        $alert = Alert::where('ruleName', 'repeated_dos_attack')
            ->where('victimDeviceId', $this->victimDeviceId)
            ->first();

        $this->assertNotNull($alert, 'Expected a repeated_dos_attack Alert to be created');
        $this->assertSame('open', $alert->status);
        $this->assertSame(3, $alert->eventCount);

        $ticket = IncidentTicket::where('relatedAlertId', (string) $alert->id)->first();

        $this->assertNotNull($ticket, 'Expected an IncidentTicket linked to the alert');
        $this->assertSame('open', $ticket->status);
        $this->assertSame('auto', $ticket->origin);
    }

    public function test_a_single_firewall_blocked_dos_event_creates_no_alert(): void
    {
        $response = $this->postJson('/api/security-events', [
            'eventType' => 'firewall_blocked_dos',
            'attackerDeviceId' => 'device-attacker',
            'victimDeviceId' => $this->victimDeviceId,
            'attackerDeviceName' => 'attacker-1',
            'victimDeviceName' => $this->victimDeviceId,
        ]);

        $response->assertStatus(201);

        $alert = Alert::where('victimDeviceId', $this->victimDeviceId)->first();

        $this->assertNull($alert, 'firewall_blocked_dos has no RULES entry, matching the existing blocked ARP/DNS behavior, so no alert should be created');
    }
}
