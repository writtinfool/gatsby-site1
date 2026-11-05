// Site-wide settings. Page copy lives in src/content/pages/*.md and is
// rendered verbatim — edit these values, not the markdown, for site chrome.

export const site = {
  name: 'Newtree Senior Transition Services',
  shortName: 'Newtree Senior Transitions',
  tagline: 'Services',
  region: 'Northern California',
  // Set this to the production domain once it is known (used for canonical URLs).
  url: 'https://transitions.newtreecap.com',
  phoneTollFree: { label: '(855) 496-1910', href: 'tel:8554961910' },
  phoneMobile: { label: '(707) 502-2191', href: 'tel:7075022191' },
  email: { label: 'harold@newtree-capital.net', href: 'mailto:harold@newtree-capital.net' },
  address: {
    street: '3824 Jacobs Ave. Spc 27',
    city: 'Eureka',
    state: 'CA',
    zip: '95501',
    country: 'US',
  },
};

// Navigation order follows the site architecture in the spec.
export const nav = [
  { slug: 'index', href: '/', label: 'Home' },
  { slug: 'placement', href: '/placement', label: 'Senior Placement' },
  { slug: 'real-estate', href: '/real-estate', label: 'Real Estate & Liquidity' },
  { slug: 'downsizing', href: '/downsizing', label: 'Downsizing & Relocation' },
  { slug: 'for-professionals', href: '/for-professionals', label: 'For Professionals' },
] as const;

// Zoho Forms embeds. Each key is the container id from the markdown
// (<div id="...">). Paste the Zoho "iframe" embed URL (the src value) to
// switch the form on; leave empty and the container stays hidden.
export const zohoForms: Record<string, { src: string; height?: number; title: string }> = {
  'zoho-family-intake-form': { src: '', title: 'Family Intake Form' },
  'zoho-placement-form': { src: '', title: 'Placement Inquiry Form' },
  'zoho-property-evaluation-form': { src: '', title: 'Real Estate Evaluation Form' },
  'zoho-downsizing-form': { src: '', title: 'Downsizing Inquiry Form' },
  'zoho-b2b-referral-form': { src: '', title: 'Professional Referral Form' },
};
