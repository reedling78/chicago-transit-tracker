// Matches the shape of CTA ttpositions.aspx JSON response, trimmed to the
// fields this project actually consumes. Returned by the proxy when
// CTA_TRAIN_TRACKER_KEY is missing so local dev and tests can render the
// component end-to-end.

export const DEV_FALLBACK_RESPONSE = {
  ctatt: {
    tmst: '2026-04-11T08:00:00',
    errCd: '0',
    errNm: null,
    route: [
      {
        '@name': 'red',
        train: [
          {
            rn: '801',
            destSt: '30173',
            destNm: 'Howard',
            trDr: '1',
            nextStaId: '30174',
            nextStaNm: 'Clark/Lake',
            prdt: '2026-04-11T08:00:00',
            arrT: '2026-04-11T08:03:00',
            isApp: '0',
            isDly: '0',
            lat: '41.88',
            lon: '-87.63',
            heading: '0',
          },
          {
            rn: '802',
            destSt: '30173',
            destNm: 'Howard',
            trDr: '1',
            nextStaId: '40560',
            nextStaNm: 'Grand',
            prdt: '2026-04-11T08:00:00',
            arrT: '2026-04-11T08:06:00',
            isApp: '0',
            isDly: '0',
            lat: '41.89',
            lon: '-87.63',
            heading: '0',
          },
          {
            rn: '901',
            destSt: '30089',
            destNm: '95th/Dan Ryan',
            trDr: '5',
            nextStaId: '41450',
            nextStaNm: 'Roosevelt',
            prdt: '2026-04-11T08:00:00',
            arrT: '2026-04-11T08:04:00',
            isApp: '0',
            isDly: '0',
            lat: '41.87',
            lon: '-87.63',
            heading: '180',
          },
        ],
      },
    ],
  },
} as const
