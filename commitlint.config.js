/**
 * commitlint configuration.
 *
 * Enforces:
 *   - Conventional Commits (via @commitlint/config-conventional)
 *   - Developer Certificate of Origin sign-off (the `signed-off-by` rule)
 *
 * A commit must therefore look like:
 *
 *   feat(my-plugin): add the thing
 *
 *   Optional body.
 *
 *   Signed-off-by: Jane Doe <jane.doe@example.com>
 *
 * Sign off with `git commit -s`. See CONTRIBUTING.md and
 * https://developercertificate.org/.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // DCO: require a "Signed-off-by:" trailer on every commit.
    "signed-off-by": [2, "always", "Signed-off-by:"],
  },
};
