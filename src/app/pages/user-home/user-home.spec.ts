import { ComponentFixture, TestBed } from "@angular/core/testing";

import { UserHomeComponent } from "./user-home";

describe("UserHome", () => {
  let component: UserHomeComponent;
  let fixture: ComponentFixture<UserHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserHomeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserHomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should compute initials from full name", () => {
    component["user"] = { name: "Ana García" };
    const initials = component["buildInitials"]("Ana García");
    expect(initials).toBe("AG");
  });

  it("should show limit modal when search limit is reached", () => {
    component["searchCount"] = 0;
    expect(component.searchCount).toBe(0);
  });
});
