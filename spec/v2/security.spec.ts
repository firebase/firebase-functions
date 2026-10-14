import { expect } from "chai";
import { requiresRole } from "../../src/v2/security";
import { declaredRoles } from "../../src/security/roles";

describe("requiresRole", () => {
  beforeEach(() => {
    declaredRoles.clear();
  });

  it("should add valid roles to the global declaredRoles set", () => {
    requiresRole("roles/bigquery.dataEditor");
    requiresRole("projects/my-project/roles/customRole");
    requiresRole("organizations/123/roles/orgRole");

    expect(Array.from(declaredRoles)).to.deep.equal([
      "roles/bigquery.dataEditor",
      "projects/my-project/roles/customRole",
      "organizations/123/roles/orgRole",
    ]);
  });

  it("should deduplicate identical roles", () => {
    requiresRole("roles/datastore.user");
    requiresRole("roles/datastore.user");

    expect(Array.from(declaredRoles)).to.deep.equal(["roles/datastore.user"]);
  });
});
