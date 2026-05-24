<?php
/**
 * Plugin Name: OmniaHouse CMS Bridge
 * Description: Strategic bridge for headless control of WordPress via the OmniaHouse Digital Office.
 * Version: 1.0.0
 * Author: OmniaHouse
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('omnia/v1', '/cms-bridge', [
        'methods' => 'POST',
        'callback' => 'omnia_bridge_handle_request',
        'permission_callback' => function ($request) {
            // Secure this with a custom header check against org_integrations secret
            $auth_header = $request->get_header('X-Omnia-Secret');
            return $auth_header === get_option('omnia_bridge_secret');
        }
    ]);
});

function omnia_bridge_handle_request($request) {
    $action = $request->get_param('action'); // e.g., 'update_product', 'get_drafts'
    $payload = $request->get_param('payload');

    switch ($action) {
        case 'get_site_stats':
            return [
                'orders_count' => count(wc_get_orders(['status' => 'processing'])),
                'products_count' => wp_count_posts('product')->publish,
                'system_status' => 'operational'
            ];
        case 'sync_inventory':
            // Logic to update WooCommerce prices/stock from OmniaHouse
            return ['success' => true, 'synced' => count($payload)];
        default:
            return new WP_Error('invalid_action', 'The requested action is not recognized by the bridge.', ['status' => 400]);
    }
}

// Seed a secret if it doesn't exist
if (!get_option('omnia_bridge_secret')) {
    update_option('omnia_bridge_secret', bin2hex(random_bytes(16)));
}