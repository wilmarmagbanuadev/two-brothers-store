import { NextRequest, NextResponse } from "next/server";

import {
  cookieOptions,
  userAccessCookie,
  userRefreshCookie
} from "@/lib/admin-session";

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/sign-in/user?account=suspended", request.url)
  );

  response.cookies.set(userAccessCookie, "", cookieOptions(0));
  response.cookies.set(userRefreshCookie, "", cookieOptions(0));

  return response;
}
