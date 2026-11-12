# Microburbs API demo

Working examples built on the [Microburbs API](https://www.microburbs.com.au/developers/api-docs): property
and suburb data for Australia. Live at **<https://www.microburbs.com.au/demos>**.

> This repository is a published snapshot of our API demos, shared as reference code. It isn't an open-source
> project and we don't take issues or pull requests; for questions, see the
> [developer docs and contact page](https://www.microburbs.com.au/developers). Each page of the live demo has a
> **View this page's code** link to its file here, and the footer links back to this repository.

The demo runs on the **public sandbox key**, `test`: free, no sign-up, and limited to nine sample suburbs
(one per state and territory) and eight sample properties. For every suburb and address in Australia,
[get a key](https://www.microburbs.com.au/developers/keys).

| Demo | Stack | What it shows |
| --- | --- | --- |
| [`nextjs-suburb-map`](nextjs-suburb-map/) | Next.js, TypeScript | The deployed site: suburb reports, listings, block maps, crime, market, property profiles and a comparison table, with every API call shown beside it. |
| [`python-quickstart`](python-quickstart/) | Python, Jupyter, pandas | The first ten minutes: a suburb, a property's value and sales, the nine sample suburbs in one table and a chart. |

## The sandbox

| Suburbs (official names) | Sample properties (GNAF id) |
| --- | --- |
| Bondi, Belmont North (NSW) | `GANSW704074813` 27 Arlington Street, Belmont North NSW |
| St Kilda (Vic.) | `GAVIC419929404` 12A Chaucer Street, St Kilda VIC |
| Fortitude Valley (QLD) | `GAQLD162849753` 305/41 Robertson Street, Fortitude Valley QLD |
| Subiaco (WA) | `GAWA_146662014` 36 Olive Street, Subiaco WA |
| Unley (SA) | `GASA_422266490` 53 Marion Street, Unley SA |
| Sandy Bay (TAS) | `GATAS702292990` 85 Lord Street, Sandy Bay TAS |
| Kambah (ACT) | `GAACT714845944` 9 McDowall Place, Kambah ACT |
| Nightcliff (NT) | `GANT_703835649` 16 Jacksonia Circuit, Nightcliff NT |

Suburb-name search (`/v1/geocode/suburb`) and the field catalogues are free and work everywhere. Every other
suburb, property, and billed endpoint such as address search answers `403` on the sandbox key.

## Try the API in one line

```bash
curl 'https://api.microburbs.com.au/v1/properties/GANSW704074813/valuation/avm' \
  -H 'Authorization: Bearer test'
```

```python
import os, requests

r = requests.get(
    "https://api.microburbs.com.au/v1/suburbs/Bondi/market/all",
    headers={"Authorization": f"Bearer {os.environ.get('MICROBURBS_API_KEY', 'test')}"},
)
print(r.json()["data"])
```

## Run it locally

```bash
git clone https://github.com/Microburbs/microburbs-api-demo.git
cd microburbs-api-demo/nextjs-suburb-map
npm install
cp .env.example .env.local      # MICROBURBS_API_KEY=test works out of the box
npm run dev                     # http://localhost:3000/demos
```

The Python quickstart: `cd python-quickstart`, `pip install -r requirements.txt`, then open
`quickstart.ipynb` (or run `python quickstart.py`). Each folder's README has the details.

## Good to know

- **Your key:** keep a real key out of your code and out of git: each demo reads it from the
  `MICROBURBS_API_KEY` environment variable (copy `.env.example` to `.env`). Apps that run in a browser
  should call the API from a server, as the Next.js demo does, so the key never reaches the page.
- **No data is still a 200:** `{"data": null, "available": false, "reason": ..., "message": ...}`.
  Check `data` before using it.
- **Limits:** about 10 requests a second per key. On `429`, wait and retry.
- **Docs:** [microburbs.com.au/developers/api-docs](https://www.microburbs.com.au/developers/api-docs) lists
  every endpoint and lets you try each one.

## Licence

[MIT](LICENSE). Data © Microburbs; estimates are automated and indicative only.
