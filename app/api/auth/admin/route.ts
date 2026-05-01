import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isAdminAuthenticated
} from "@/lib/adminAuth";

export const runtime = "nodejs";

function checkPasswordExists(): boolean {
  return !!(process.env.ADMIN_PASSWORD);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { password?: string };
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "请输入密码" },
        { status: 400 }
      );
    }

    if (!checkPasswordExists()) {
      return NextResponse.json(
        { success: false, error: "管理员密码未配置" },
        { status: 500 }
      );
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 401 }
      );
    }

    const { token, maxAge } = createAdminSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式无效" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const authenticated = isAdminAuthenticated(req);
  const passwordExists = checkPasswordExists();
  return NextResponse.json({ authenticated, passwordExists });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
