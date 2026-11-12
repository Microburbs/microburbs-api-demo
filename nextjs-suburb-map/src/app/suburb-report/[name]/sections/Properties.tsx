import { shortName } from "@/lib/api";
import { int, money, propertyType } from "@/lib/format";
import { type Json, get } from "../load";
import { Calls, Differs, NotInApi, ReportCard, SectionTitle, StatTile } from "../ui";
import { type PropRow, PropertiesPanel } from "./PropertiesPanel";

/*
 * Properties: four headline figures, then recent sales and current listings in
 * a table beside a map.
 */
export default async function PropertiesSection({ name }: { name: string }) {
  const [summary, rent, sales, listings] = await Promise.all([
    get<Json>(name, "sales/summary"),
    get<Json>(name, "market/median-rent"),
    get<Json>(name, "sales/recent?limit=200"),
    get<Json>(name, "listings/for-sale?limit=100"),
  ]);
  const short = shortName(name);

  const sold: PropRow[] = (sales.data?.results ?? []).map((r: Json, i: number) => ({
    id: `s${i}-${r.gnaf_pid}`,
    address: r.address,
    type: propertyType(r.property_type),
    beds: r.bedrooms,
    baths: r.bathrooms,
    price: r.sold_price,
    date: r.sold_date,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  }));
  const forSale: PropRow[] = (listings.data?.results ?? []).map((r: Json, i: number) => ({
    id: `l${i}-${r.listing_id}`,
    address: r.address?.street ?? r.area_name,
    type: propertyType(r.property_type),
    beds: r.attributes?.bedrooms ?? null,
    baths: r.attributes?.bathrooms ?? null,
    price: r.price ?? null,
    priceText: r.display_price ?? null,
    date: r.listing_date,
    lat: r.coordinates?.latitude ?? null,
    lng: r.coordinates?.longitude ?? null,
  }));

  return (
    <ReportCard id="properties">
      <Calls results={[summary, rent, sales, listings]} />
      <SectionTitle
        icon="📍"
        title={`Properties, ${short}`}
        sub={`Recent sales and current listings for ${short}. Hover a row to locate the property on the map.`}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile value={int(summary.data?.sales_count_3y)} label="Recent sales (3 yrs)" />
        <StatTile
          value={
            <>
              {int(listings.data?.total)}
              <Differs>The site counts for-sale listings with its own de-duplication, so its number can differ from the API total.</Differs>
            </>
          }
          label="Currently for sale"
        />
        <StatTile value={rent.data?.house != null ? `$${int(rent.data.house)}` : "–"} label="Avg weekly rent (houses)" />
        <StatTile value={money(summary.data?.median_sold_price_3y)} label="Median sale (3 yrs)" />
      </div>

      {sold.length || forSale.length ? (
        <PropertiesPanel suburb={name} sold={sold} forSale={forSale} />
      ) : (
        <NotInApi what="Recent sales and listings" />
      )}

      <div className="mt-4">
        <NotInApi
          compact
          what="Yield per property and the 👍/👎 rule (yield above 3% or asking below estimate; yield below 2% or asking above estimate)"
          note="Needs a rental estimate and a value estimate for every row. The API serves those only one property at a time (properties/{id}/…), not on the suburb's sales or listings."
        />
      </div>
    </ReportCard>
  );
}
