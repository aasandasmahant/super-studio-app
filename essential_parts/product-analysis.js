function buildProductAnalysis(product = {}, customAnalysis = null) {
  if (customAnalysis && typeof customAnalysis === 'object') {
    return {
      productId: product.id || '',
      summary: customAnalysis.summary || '',
      prosHighlight: Array.isArray(customAnalysis.prosHighlight) ? customAnalysis.prosHighlight : [],
      consHighlight: Array.isArray(customAnalysis.consHighlight) ? customAnalysis.consHighlight : [],
      verdict: customAnalysis.verdict || ''
    };
  }
  return {
    productId: product.id || '',
    summary: '',
    prosHighlight: Array.isArray(product.pros) ? product.pros : [],
    consHighlight: Array.isArray(product.cons) ? product.cons : [],
    verdict: ''
  };
}

module.exports = { buildProductAnalysis };
