import { TestBed } from "@angular/core/testing";

import { PublicData } from "./public-data";

describe("PublicData", () => {
  let service: PublicData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PublicData);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
