import * as https from 'https';

/**
 * Makes an http request asynchronously and returns the response data.
 *
 * This function wraps the callback-based `http.request()` function with a
 * Promise. The returned Promise will be rejected in case the request fails with an
 * error, or the response code is not in the 200-299 range.
 *
 * @param options Request options for the request.
 * @param body Optional body to send as part of the request.
 * @returns Promise returning the response data as string.
 */
export function makeRequest(
  options: https.RequestOptions,
  body?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode > 299) {
          reject(body);
          return;
        }
        resolve(body);
      });
    });
    if (body) {
      request.write(body);
    }
    request.on('error', reject);
    request.end();
  });
}
