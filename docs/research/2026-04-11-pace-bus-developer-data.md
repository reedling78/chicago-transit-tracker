# Research: Pace Suburban Bus developer data availability

**Date:** 2026-04-11
**Question:** What endpoints, feeds, and data types can we use to build a Pace section on Chicago Transit Tracker with parity to the existing CTA and Metra sections?
**Feeds into:** Brainstorming and design for a new `/pace` section of the site.

---

## Key Findings

**Pace static GTFS is freely available and sufficient for a full reference section.**
The current feed is published at `https://www.pacebus.com/gtfsdownload` (historic mirror: `https://public.pacebus.com/gtfs/gtfs.zip`), updated roughly monthly. It is a standard GTFS zip covering routes, stops, trips, stop_times, calendars, and shapes. Transitland lists it with permissive terms (`Use allowed without attribution: Yes`, `Creating derived products allowed: Yes`). Pace's own license is more restrictive — non-exclusive, limited, revocable, non-commercial use — but does permit redistribution in derived apps. One caveat: the feed only covers routes equipped with Pace's Intelligent Bus System (IBS); a small number of community and vanpool routes are excluded.

**Pace does not publish a realtime API.** This is the hard constraint that shapes the whole design.

- Pace's own developer page explicitly states realtime predictions "are not available for download."
- Pace's consumer realtime tracker at `tmweb.pacebus.com/TMWebWatch/` runs on **Trapeze TransitMaster** (confirmed via response headers: IIS / ASP.NET / TransitMaster). This is a different vendor from Clever Devices BusTime, and there is no public API layer exposed on that host.
- No GTFS-realtime feed for Pace is registered on Transitland, the Mobility Database, or any of the usual public feed registries.
- Transit App and Google Maps display Pace realtime, but both have private data-sharing agreements with Pace. That route is not open to public developers without a direct arrangement.

**Pace is not hosted on CTA's BusTime instance.** This matters because the CTA Bus Tracker API at `www.ctabustracker.com/bustime/api/v2/` is Clever Devices BusTime, and multi-agency BusTime installs list every hosted agency via `getrtpidatafeeds`. Verified directly with a valid key:

```
GET /bustime/api/v2/getrtpidatafeeds?key=...&format=json
→ { "rtpidatafeeds": [ { "name": "bustime", "source": "Bus Tracker", "agency": "CTA" } ] }
```

Only CTA. The `ctabustracker.com` Angular app bundle (1.2 MB `main.*.js`) contains **zero** references to Pace — no route lists, no feed identifiers, no fallback URLs. Requests with `rtpidatafeed=Pace` on `getroutes`, `getvehicles`, and `getpredictions` all return empty or "no data." The CTA Bus Tracker API is single-agency CTA only.

**CTA Bus Tracker API keys are not a path to Pace data.** The key issued by `ctabustracker.com/home` is a valid Clever Devices BusTime API key for CTA — useful for any future CTA bus work on this site (and potentially relevant for CTA bus parity later), but it provides no Pace access at all.

**Service alerts for Pace have no public feed.** Alerts are published on `pacebus.com` and via email/SMS subscription only. There is no equivalent to the CTA Customer Alerts API or the Metra GTFS-RT alerts feed.

**Pace branding is stricter than CTA.** The Pace license reads: *"Licensee may not use the Pace name or logo without the prior written consent of Pace."* Descriptive references to Pace by name in body copy are standard usage and fine, but the Pace logo cannot be displayed and any design language implying endorsement should be avoided. For comparison, CTA's guidelines are more permissive (they allow the L icon and Train Tracker/Bus Tracker icons in monochrome under specific conditions).

## Options / Trade-offs

Given the constraints, three paths were considered for the site's Pace section:

**1. Static-only section (selected).** Build a Pace section structurally similar to the Metra section minus realtime. A new `syncPaceGtfs` Cloud Function mirrors the existing `syncCtaGtfs` / `syncMetraGtfs` pattern, parses the Pace GTFS zip, and writes derived documents into new Firestore collections. The pages become a reference tool: route list, route detail (stops, map, schedules), stop detail (timetables by direction and service type). No live tracking promises. Clean scope, zero dependency on unreleased APIs, and fully additive — if realtime data access is ever secured, the realtime layer drops on top of the same static data model without redesign.

**2. Pursue private Pace realtime agreement first.** Contact Pace directly to negotiate data-sharing access comparable to what Transit App and Google have. High uncertainty, unknown timeline, and blocks all Pace work until resolved. Rejected as the starting point, but worth pursuing independently in parallel if realtime parity with CTA/Metra is a long-term goal.

**3. Scrape `tmweb.pacebus.com`.** Technically feasible but fragile, implicitly against Pace's terms, and would create a maintenance liability. Not recommended.

**Recommendation: Option 1**, with option 2 available as a separate parallel initiative. Static work is not wasted if realtime arrives later.

## Open Questions

- Does Pace offer any non-public data access program we haven't surfaced through web search? (Direct outreach would be the way to find out.)
- How many of Pace's ~240 routes are actually in the GTFS feed (IBS-equipped vs. excluded)? Only the feed itself will answer this.
- Does the Pace GTFS feed include reliable route colors in `routes.txt`? If not, we'll need a fallback palette.

## Sources

- [Pace Route Timetable Data Services](https://www.pacebus.com/route-timetable-data-services)
- [Pace Bus Tracker Tools](https://www.pacebus.com/bus-tracker-tools)
- [Transitland — Pace Suburban Bus feed (f-dp3-pace)](https://www.transit.land/feeds/f-dp3-pace)
- [CTA Bus Tracker Developer Center](https://www.transitchicago.com/developers/bustracker/)
- [CTA Bus Tracker API Developer Guide (2016 PDF)](https://www.transitchicago.com/assets/1/6/cta_Bus_Tracker_API_Developer_Guide_and_Documentation_20160929.pdf)
- [Pace Bus Tracker consumer interface (TMWebWatch)](https://tmweb.pacebus.com/TMWebWatch/)
- Direct API probes against `https://www.ctabustracker.com/bustime/api/v2/` (2026-04-11) — confirmed CTA-only, no Pace feed exposed.
