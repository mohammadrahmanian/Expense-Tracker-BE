import crypto from "crypto";

class JwtSecretKey {
  private static instance: JwtSecretKey;
  private secret: string;

  private constructor() {
    const secret = crypto.randomBytes(32).toString("hex");
    this.secret = secret;
  }

  public static getInstance(): JwtSecretKey {
    if (!JwtSecretKey.instance) {
      JwtSecretKey.instance = new JwtSecretKey();
    }
    return JwtSecretKey.instance;
  }

  public getSecret(): string {
    return this.secret;
  }
}

export const jwtSecretKey = JwtSecretKey.getInstance().getSecret();
