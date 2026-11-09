// Bỏ dấu tiếng Việt + chữ thường để tìm tên: "dung" khớp "Dũng", "dat" khớp "Đạt"
export const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/\s+/g, " ");
