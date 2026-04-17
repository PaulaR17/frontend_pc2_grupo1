import { TestBed } from "@angular/core/testing";

import { Conexion } from "./conexion";

describe("Conexion", () => {
  let service: Conexion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Conexion);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
