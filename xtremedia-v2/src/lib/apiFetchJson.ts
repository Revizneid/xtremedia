export type ApiFetchJsonError = Error & {
  status?: number;
  errorId?: string | null;
};

function getFallbackMessage(status: number): string {
  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ';
  }
  if (status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này';
  }
  if (status === 404) {
    return 'Không tìm thấy dữ liệu yêu cầu';
  }
  if (status === 500) {
    return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau';
  }
  return 'Yêu cầu không thành công';
}

export async function apiFetchJson<T = unknown>(
  url: string,
  init: RequestInit = {},
  responseOverride?: Response
): Promise<T | null> {
  const response = responseOverride ?? await fetch(url, {
    ...init,
    credentials: 'same-origin',
  });

  const rawText = await response.text();
  let data: unknown = null;

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const payload = data as { error?: string; message?: string; errorId?: string } | null;
    const message = payload?.error || payload?.message || getFallbackMessage(response.status);
    const error = new Error(message) as ApiFetchJsonError;
    error.status = response.status;
    error.errorId = payload?.errorId ?? null;
    throw error;
  }

  return data as T | null;
}
