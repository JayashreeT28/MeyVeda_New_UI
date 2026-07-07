import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mv_auth";

interface CookiePayload {
  role: string;
  phone: string;
}

function getAuth(req: NextRequest): CookiePayload | null {
  const value = req.cookies.get(COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    return JSON.parse(atob(value)) as CookiePayload;
  } catch {
    return null;
  }
}

// Routes that require the doctor/practitioner role
const DOCTOR_ROUTES = ["/pro"];

// Routes that require patient role
const PATIENT_ROUTES = [
  "/discover",
  "/ai-chat",
  "/records",
  "/apothecary",
  "/profile",
  "/doctor",
  "/booking",
  "/checkout",
  "/prescription",
  "/consent",
  "/orders",
  "/consult",
  "/waiting-room",
  "/post-consult",
  "/appointments",
  "/dinacharya",
  "/notifications",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const auth = getAuth(req);

  // 1. Auth Page redirection
  if (pathname.startsWith("/onboarding")) {
    if (auth) {
      let dest = "/";
      if (auth.role === "doctor" || auth.role === "practitioner") dest = "/pro";
      if (auth.role === "admin" || auth.role === "intern_staff") dest = "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // 2. Admin Route Protection
  if (pathname.startsWith("/admin")) {
    // Allow the login page
    if (pathname === "/admin") {
      if (auth && (auth.role === "admin" || auth.role === "intern_staff")) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // Protect all other admin sub-routes
    if (!auth) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (auth.role !== "admin" && auth.role !== "intern_staff") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Role-based restrictions for intern_staff (limited admin powers — inventory, content, no financial or verification access)
    if (auth.role === "intern_staff") {
      const allowedPaths = ["/admin/medicines", "/admin/hospitals", "/admin/content"];
      const isAllowed = allowedPaths.some(path => pathname.startsWith(path));
      if (!isAllowed) {
        // Redirect to their default allowed dashboard/page
        return NextResponse.redirect(new URL("/admin/medicines", req.url));
      }
    }

    return NextResponse.next();
  }

  // 3. Doctor Route Protection
  const isDoctorRoute = DOCTOR_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"));
  if (isDoctorRoute) {
    if (!auth) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    if (auth.role !== "doctor" && auth.role !== "practitioner") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 4. Patient Route Protection
  const isPatientRoute = PATIENT_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/")) || pathname === "/";
  if (isPatientRoute) {
    if (!auth) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    if (auth.role !== "patient") {
      // Redirect to their respective dashboards
      let dest = "/";
      if (auth.role === "doctor" || auth.role === "practitioner") dest = "/pro";
      if (auth.role === "admin" || auth.role === "intern_staff") dest = "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
