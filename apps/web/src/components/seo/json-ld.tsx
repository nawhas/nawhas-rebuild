import { serializeJsonLd } from '@/lib/jsonld';

interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Injects a JSON-LD structured data block into the page.
 * Server Component — renders a <script type="application/ld+json"> tag.
 * Data is serialized with HTML entity escaping to prevent XSS.
 */
export function JsonLd({ data }: JsonLdProps): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
