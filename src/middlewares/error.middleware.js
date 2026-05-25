function notFound(req, res) {
  return res.status(404).json({
    error: true,
    message: 'API endpoint not found.'
  });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  return res.status(error.status || 500).json({
    error: true,
    message: error.message || 'Internal server error.'
  });
}

module.exports = { notFound, errorHandler };
