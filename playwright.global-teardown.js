const setup = require('./playwright.global-setup.js');

module.exports = async function () {
  const server = setup.server;
  if (server) {
    return new Promise((resolve) => server.close(resolve));
  }
};
