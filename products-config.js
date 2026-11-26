const DEFAULT_PRODUCTS = [
  {
    id: 'prod_1',
    tier: 'low',
    company: '',
    title: '',
    price: '',
    rating: '',
    accuratePercent: '',
    benefitsCount: 0,
    pros: [],
    cons: [],
    buyFor: '',
    skipFor: '',
    affiliatePartnerId: 'aff_30',
    productSlug: '',
    images: []
  },
  {
    id: 'prod_2',
    tier: 'medium',
    company: '',
    title: '',
    price: '',
    rating: '',
    accuratePercent: '',
    benefitsCount: 0,
    pros: [],
    cons: [],
    buyFor: '',
    skipFor: '',
    affiliatePartnerId: 'aff_40',
    productSlug: '',
    images: []
  },
  {
    id: 'prod_3',
    tier: 'high',
    company: '',
    title: '',
    price: '',
    rating: '',
    accuratePercent: '',
    benefitsCount: 0,
    pros: [],
    cons: [],
    buyFor: '',
    skipFor: '',
    affiliatePartnerId: 'aff_50',
    productSlug: '',
    images: []
  }
];

function resolveProducts(dbProducts = null) {
  if (Array.isArray(dbProducts) && dbProducts.length > 0) {
    return dbProducts;
  }
  return DEFAULT_PRODUCTS;
}

module.exports = { DEFAULT_PRODUCTS, resolveProducts };
