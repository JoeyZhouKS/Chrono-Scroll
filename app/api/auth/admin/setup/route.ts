import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken
} from "@/lib/adminAuth";

export const runtime = "nodejs";

function writePasswordToEnv(password: string): boolean {
  try {
    const envLocalPath = path.join(process.cwd(), ".env.local");
    const envContent = `ADMIN_PASSWORD=${password}\n`;

    if (fs.existsSync(envLocalPath)) {
      const existing = fs.readFileSync(envLocalPath, "utf-8");
      const lines = existing.split("\n");
      const newLines = lines.map((line) => {
        if (line.startsWith("ADMIN_PASSWORD=")) {
          return envContent.trim();
        }
        return line;
      });
      const content = newLines.join("\n");
      fs.writeFileSync(envLocalPath, content, "utf-8");
    } else {
      fs.writeFileSync(envLocalPath, envContent, "utf-8");
    }
    return true;
  } catch {
    return false;
  }
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

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "密码长度至少为6个字符" },
        { status: 400 }
      );
    }

    if (process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "密码已设置" },
        { status: 400 }
      );
    }

    const success = writePasswordToEnv(password);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "写入配置文件失败" },
        { status: 500 }
      );
    }

    // 设置环境变量，使当前进程也能使用新密码
    process.env.ADMIN_PASSWORD = password;

    // 创建会话令牌
    const { token, maxAge } = createAdminSessionToken();
    const response = NextResponse.json({ 
      success: true,
      message: "密码设置成功" 
    });
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
