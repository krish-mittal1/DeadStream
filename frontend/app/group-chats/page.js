"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /group-chats is deprecated — group chats are now the "Roundtables" tab in /dm.
 * Redirect preserves any existing bookmarks or external links.
 */
export default function GroupChatsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dm");
  }, [router]);
  return null;
}
