exports.cleanBreadcrumb = function (value) {
  const parts = value.replace(/"/g, '').split('/');
  return parts[parts.length - 1];
};
