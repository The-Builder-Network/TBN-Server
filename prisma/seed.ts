import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ─── Seed data inlined from frontend constants ────────────────

const services = [
  {
    slug: 'architectural-services',
    name: 'Architectural Services',
    imageUrl:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop',
  },
  {
    slug: 'bathroom-fitting',
    name: 'Bathroom Fitting',
    imageUrl:
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop',
  },
  {
    slug: 'bricklaying-repointing',
    name: 'Bricklaying & Repointing',
    imageUrl:
      'https://images.unsplash.com/photo-1590237294019-ca0dea0e1265?w=800&h=600&fit=crop',
  },
  {
    slug: 'carpentry-joinery',
    name: 'Carpentry & Joinery',
    imageUrl:
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop',
  },
  {
    slug: 'carpets-lino-flooring',
    name: 'Carpets, Lino & Flooring',
    imageUrl:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop',
  },
  {
    slug: 'central-heating',
    name: 'Central Heating',
    imageUrl:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop',
  },
  {
    slug: 'chimney-fireplace',
    name: 'Chimney & Fireplace',
    imageUrl:
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=600&fit=crop',
  },
  {
    slug: 'cleaning-services',
    name: 'Cleaning Services',
    imageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop',
  },
  {
    slug: 'conservatories',
    name: 'Conservatories',
    imageUrl:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop',
  },
  {
    slug: 'conversions',
    name: 'Conversions',
    imageUrl:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop',
  },
  {
    slug: 'damp-proofing',
    name: 'Damp Proofing',
    imageUrl:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop',
  },
  {
    slug: 'demolition-clearance',
    name: 'Demolition & Clearance',
    imageUrl:
      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=600&fit=crop',
  },
  {
    slug: 'driveways-paving',
    name: 'Driveways & Paving',
    imageUrl:
      'https://images.unsplash.com/photo-1588595130265-f2e972d0f0e4?w=800&h=600&fit=crop',
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    imageUrl:
      'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop',
  },
  {
    slug: 'extensions',
    name: 'Extensions',
    imageUrl:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
  },
  {
    slug: 'fascias-soffits-guttering',
    name: 'Fascias, Soffits & Guttering',
    imageUrl:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  },
  {
    slug: 'fencing',
    name: 'Fencing',
    imageUrl:
      'https://images.unsplash.com/photo-1533042789716-e9a34b797399?w=800&h=600&fit=crop',
  },
  {
    slug: 'gardening-landscaping',
    name: 'Gardening & Landscaping',
    imageUrl:
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop',
  },
  {
    slug: 'gas-works',
    name: 'Gas Works',
    imageUrl:
      'https://images.unsplash.com/photo-1621905252472-128fc6df4e77?w=800&h=600&fit=crop',
  },
  {
    slug: 'groundwork-foundations',
    name: 'Groundwork & Foundations',
    imageUrl:
      'https://images.unsplash.com/photo-1590237294019-ca0dea0e1265?w=800&h=600&fit=crop',
  },
  {
    slug: 'handyman',
    name: 'Handyman',
    imageUrl:
      'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800&h=600&fit=crop',
  },
  {
    slug: 'insulation',
    name: 'Insulation',
    imageUrl:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop',
  },
  {
    slug: 'kitchen-fitting',
    name: 'Kitchen Fitting',
    imageUrl:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
  },
  {
    slug: 'locksmith',
    name: 'Locksmith',
    imageUrl:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  },
  {
    slug: 'loft-conversion',
    name: 'Loft Conversion',
    imageUrl:
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&h=600&fit=crop',
  },
  {
    slug: 'moving-services',
    name: 'Moving Services',
    imageUrl:
      'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&h=600&fit=crop',
  },
  {
    slug: 'new-build',
    name: 'New Build',
    imageUrl:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop',
  },
  {
    slug: 'painting-decorating',
    name: 'Painting & Decorating',
    imageUrl:
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=600&fit=crop',
  },
  {
    slug: 'plastering-rendering',
    name: 'Plastering & Rendering',
    imageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop',
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    imageUrl:
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop',
  },
  {
    slug: 'restoration-refurbishment',
    name: 'Restoration & Refurbishment',
    imageUrl:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop',
  },
  {
    slug: 'roofing',
    name: 'Roofing',
    imageUrl:
      'https://images.unsplash.com/photo-1632778841148-afb6bffdee87?w=800&h=600&fit=crop',
  },
  {
    slug: 'security-systems',
    name: 'Security Systems',
    imageUrl:
      'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&h=600&fit=crop',
  },
  {
    slug: 'stonemasonry',
    name: 'Stonemasonry',
    imageUrl:
      'https://images.unsplash.com/photo-1590237294019-ca0dea0e1265?w=800&h=600&fit=crop',
  },
  {
    slug: 'tiling',
    name: 'Tiling',
    imageUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
  },
  {
    slug: 'tree-surgery',
    name: 'Tree Surgery',
    imageUrl:
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=600&fit=crop',
  },
  {
    slug: 'windows-door-fitting',
    name: 'Windows & Door Fitting',
    imageUrl:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
  },
];

const trades = [
  {
    slug: 'architectural-designer',
    name: 'Architectural Designer',
    serviceSlug: 'architectural-services',
  },
  {
    slug: 'architectural-technician',
    name: 'Architectural Technician',
    serviceSlug: 'architectural-services',
  },
  {
    slug: 'bathroom-fitter',
    name: 'Bathroom Fitter',
    serviceSlug: 'bathroom-fitting',
  },
  {
    slug: 'bricklayer',
    name: 'Bricklayer',
    serviceSlug: 'bricklaying-repointing',
  },
  {
    slug: 'repointing-specialist',
    name: 'Repointing Specialist',
    serviceSlug: 'bricklaying-repointing',
  },
  {
    slug: 'wardrobe-fitter',
    name: 'Wardrobe Fitter',
    serviceSlug: 'carpentry-joinery',
  },
  {
    slug: 'carpenter-joiner',
    name: 'Carpenter & Joiner',
    serviceSlug: 'carpentry-joinery',
  },
  {
    slug: 'cabinet-maker',
    name: 'Cabinet Maker',
    serviceSlug: 'carpentry-joinery',
  },
  {
    slug: 'decking-installer',
    name: 'Decking Installer',
    serviceSlug: 'carpentry-joinery',
  },
  {
    slug: 'carpet-fitter',
    name: 'Carpet Fitter',
    serviceSlug: 'carpets-lino-flooring',
  },
  {
    slug: 'flooring-fitter',
    name: 'Flooring Fitter',
    serviceSlug: 'carpets-lino-flooring',
  },
  {
    slug: 'vinyl-flooring-fitter',
    name: 'Vinyl Flooring Fitter',
    serviceSlug: 'carpets-lino-flooring',
  },
  {
    slug: 'boiler-installation-specialist',
    name: 'Boiler Installation Specialist',
    serviceSlug: 'central-heating',
  },
  {
    slug: 'boiler-repair-specialist',
    name: 'Boiler Repair Specialist',
    serviceSlug: 'central-heating',
  },
  {
    slug: 'heating-engineer',
    name: 'Heating Engineer',
    serviceSlug: 'central-heating',
  },
  {
    slug: 'chimney-sweep',
    name: 'Chimney Sweep',
    serviceSlug: 'chimney-fireplace',
  },
  {
    slug: 'stove-fitter',
    name: 'Stove Fitter',
    serviceSlug: 'chimney-fireplace',
  },
  {
    slug: 'fireplace-installer',
    name: 'Fireplace installer',
    serviceSlug: 'chimney-fireplace',
  },
  {
    slug: 'chimney-repair-specialist',
    name: 'Chimney Repair Specialist',
    serviceSlug: 'chimney-fireplace',
  },
  { slug: 'cleaner', name: 'Cleaner', serviceSlug: 'cleaning-services' },
  {
    slug: 'window-cleaner',
    name: 'Window Cleaner',
    serviceSlug: 'cleaning-services',
  },
  {
    slug: 'conservatory-repair-specialist',
    name: 'Conservatory Repair Specialist',
    serviceSlug: 'conservatories',
  },
  {
    slug: 'conservatory-installer',
    name: 'Conservatory Installer',
    serviceSlug: 'conservatories',
  },
  {
    slug: 'conversion-specialist',
    name: 'Conversion Specialist',
    serviceSlug: 'conversions',
  },
  {
    slug: 'garage-conversion-specialist',
    name: 'Garage Conversion Specialist',
    serviceSlug: 'conversions',
  },
  { slug: 'damp-proofer', name: 'Damp Proofer', serviceSlug: 'damp-proofing' },
  {
    slug: 'waste-rubbish-clearance',
    name: 'Waste & Rubbish Clearance Company',
    serviceSlug: 'demolition-clearance',
  },
  {
    slug: 'demolition-company',
    name: 'Demolition Company',
    serviceSlug: 'demolition-clearance',
  },
  {
    slug: 'driveways-installer',
    name: 'Driveways Installer',
    serviceSlug: 'driveways-paving',
  },
  {
    slug: 'tarmac-driveway-company',
    name: 'Tarmac Driveway Company',
    serviceSlug: 'driveways-paving',
  },
  { slug: 'electrician', name: 'Electrician', serviceSlug: 'electrical' },
  { slug: 'builder', name: 'Builder', serviceSlug: 'extensions' },
  {
    slug: 'extension-builder',
    name: 'Extension Builder',
    serviceSlug: 'extensions',
  },
  {
    slug: 'gutter-cleaning-specialist',
    name: 'Gutter Cleaning Specialist',
    serviceSlug: 'fascias-soffits-guttering',
  },
  {
    slug: 'gutter-repair-specialist',
    name: 'Gutter Repair Specialist',
    serviceSlug: 'fascias-soffits-guttering',
  },
  {
    slug: 'guttering-installer',
    name: 'Guttering Installer',
    serviceSlug: 'fascias-soffits-guttering',
  },
  {
    slug: 'fascias-soffits-installer',
    name: 'Fascias & Soffits Installer',
    serviceSlug: 'fascias-soffits-guttering',
  },
  { slug: 'fencer', name: 'Fencer', serviceSlug: 'fencing' },
  {
    slug: 'garden-clearance-specialist',
    name: 'Garden Clearance Specialist',
    serviceSlug: 'gardening-landscaping',
  },
  {
    slug: 'landscaper',
    name: 'Landscaper',
    serviceSlug: 'gardening-landscaping',
  },
  { slug: 'gardener', name: 'Gardener', serviceSlug: 'gardening-landscaping' },
  {
    slug: 'garden-maintenance-company',
    name: 'Garden Maintenance Company',
    serviceSlug: 'gardening-landscaping',
  },
  { slug: 'gas-engineer', name: 'Gas Engineer', serviceSlug: 'gas-works' },
  {
    slug: 'groundworker',
    name: 'Groundworker',
    serviceSlug: 'groundwork-foundations',
  },
  { slug: 'handyman', name: 'Handyman', serviceSlug: 'handyman' },
  {
    slug: 'insulation-company',
    name: 'Insulation Company',
    serviceSlug: 'insulation',
  },
  {
    slug: 'kitchen-fitter',
    name: 'Kitchen Fitter',
    serviceSlug: 'kitchen-fitting',
  },
  { slug: 'locksmith', name: 'Locksmith', serviceSlug: 'locksmith' },
  {
    slug: 'loft-conversion-company',
    name: 'Loft Conversion Company',
    serviceSlug: 'loft-conversion',
  },
  {
    slug: 'moving-company',
    name: 'Moving Company',
    serviceSlug: 'moving-services',
  },
  {
    slug: 'new-home-builder',
    name: 'New Home Builder',
    serviceSlug: 'new-build',
  },
  {
    slug: 'painter-decorator',
    name: 'Painter & Decorator',
    serviceSlug: 'painting-decorating',
  },
  { slug: 'plasterer', name: 'Plasterer', serviceSlug: 'plastering-rendering' },
  { slug: 'plumber', name: 'Plumber', serviceSlug: 'plumbing' },
  {
    slug: 'building-restoration-refurbishment-company',
    name: 'Building Restoration & Refurbishment Company',
    serviceSlug: 'restoration-refurbishment',
  },
  { slug: 'roof-cleaner', name: 'Roof Cleaner', serviceSlug: 'roofing' },
  {
    slug: 'roof-repair-specialist',
    name: 'Roof Repair Specialist',
    serviceSlug: 'roofing',
  },
  { slug: 'roofer', name: 'Roofer', serviceSlug: 'roofing' },
  {
    slug: 'cctv-installer',
    name: 'CCTV Installer',
    serviceSlug: 'security-systems',
  },
  {
    slug: 'security-system-installer',
    name: 'Security System Installer',
    serviceSlug: 'security-systems',
  },
  { slug: 'stonemason', name: 'Stonemason', serviceSlug: 'stonemasonry' },
  { slug: 'tiler', name: 'Tiler', serviceSlug: 'tiling' },
  { slug: 'tree-surgeon', name: 'Tree Surgeon', serviceSlug: 'tree-surgery' },
  {
    slug: 'double-glazing-repair-specialist',
    name: 'Double Glazing Repair Specialist',
    serviceSlug: 'windows-door-fitting',
  },
  {
    slug: 'door-fitter',
    name: 'Door Fitter',
    serviceSlug: 'windows-door-fitting',
  },
  { slug: 'glazier', name: 'Glazier', serviceSlug: 'windows-door-fitting' },
  {
    slug: 'window-fitter',
    name: 'Window Fitter',
    serviceSlug: 'windows-door-fitting',
  },
];

async function main() {
  console.log('Seeding services...');
  for (const svc of services) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: { name: svc.name, imageUrl: svc.imageUrl },
      create: svc,
    });
  }
  console.log(`✓ ${services.length} services seeded`);

  console.log('Seeding trades...');
  for (const trade of trades) {
    await prisma.trade.upsert({
      where: { slug: trade.slug },
      update: { name: trade.name, serviceSlug: trade.serviceSlug },
      create: trade,
    });
  }
  console.log(`✓ ${trades.length} trades seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
