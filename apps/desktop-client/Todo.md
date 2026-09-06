# Pinnacle Desktop Client TODO

## Necessary

- Add a production-safe fallback when Syphon or its native framework cannot load.
- Validate and sanitize renderer-provided stream URLs before loading them in the offscreen window.
- Add cleanup for render timers, state subscriptions, protocol handlers, and BrowserWindows during shutdown.
- Test ARM64 packaging with the bundled `Syphon.framework` and `syphon.node` on a clean machine.
- Add automated tests for discovery results, scan state, stream URL state, and IPC payloads.

## Important

- Replace sequential network probing with bounded concurrent probing to reduce scan time.
- Add scan cancellation and a timeout for `arp -a` and broadcast ping operations.
- Add a typed shared contract for preload APIs, IPC channels, server records, lifecycle status, and stream status.
- Report scan and render errors to the UI with recoverable actions instead of logging only.
- Add a real connected-server identity based on host and port rather than object reference equality.
- Make the tray popover position and visibility behavior platform-specific and test it on macOS and Windows.
- Add a packaging verification script that checks native binaries, frameworks, and exported Next assets.

## Nice to have

- Add server names and metadata discovery instead of displaying only host and port.
- Add remembered stream targets and a recent-server list.
- Add a tray context menu with refresh, reconnect, and quit actions.
- Add configurable scan ports and scan intervals.
- Add a compact connection-quality or frame-rate indicator.
- Add optional application logs and diagnostics export for support requests.
