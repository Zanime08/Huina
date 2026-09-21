# -*- coding: utf-8 -*-
"""Вспомогательный модуль вёрстки слайдов: расчёт высоты текста и поточное размещение
(«стопка»), чтобы блоки гарантированно не накладывались друг на друга."""
import os
from PIL import ImageFont
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_fc = {}
CALIBRI_K = 0.96   # DejaVu шире Calibri — поправка, чтобы не недооценить высоту


def _f(sz, bold):
    key = (int(sz * 4), bold)
    if key not in _fc:
        _fc[key] = ImageFont.truetype(BOLD if bold else REG, int(round(sz * 96 / 72)))
    return _fc[key]


def text_w(t, sz, bold=False):
    return _f(sz, bold).getlength(t) / 96 * CALIBRI_K


def wrap_lines(t, width_in, sz, bold=False):
    t = str(t)
    if not t:
        return [""]
    out, cur = [], ""
    for word in t.split():
        trial = (cur + " " + word).strip()
        if not cur or text_w(trial, sz, bold) <= width_in:
            cur = trial
        else:
            out.append(cur)
            cur = word
    out.append(cur)
    return out


def paras_height(paras, width_in):
    """paras: список словарей {text, size, bold, space_after, line_spacing}"""
    h = 0.0
    for p in paras:
        lines = len(wrap_lines(p.get("text", ""), width_in, p.get("size", 14), p.get("bold", False)))
        ls = p.get("line_spacing", 1.15)
        h += lines * p.get("size", 14) * ls / 72.0
        h += p.get("space_after", 6) / 72.0
    return h


class Stack:
    """Размещает элементы друг под другом в колонке фиксированной ширины."""

    def __init__(self, slide, x, y, w):
        self.s = slide
        self.x = x
        self.y = y
        self.w = w

    # ---------- базовые примитивы ----------
    def _tb(self, paras, y, h, align):
        tb = self.s.shapes.add_textbox(Inches(self.x), Inches(y), Inches(self.w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = Inches(0.03)
        tf.margin_top = tf.margin_bottom = 0
        first = True
        for p in paras:
            para = tf.paragraphs[0] if first else tf.add_paragraph()
            first = False
            para.alignment = p.get("align", align)
            para.space_after = Pt(p.get("space_after", 6))
            para.line_spacing = p.get("line_spacing", 1.15)
            r = para.add_run()
            r.text = str(p.get("text", ""))
            f = r.font
            f.name = "Calibri"
            f.size = Pt(p.get("size", 14))
            f.bold = p.get("bold", False)
            f.italic = p.get("italic", False)
            f.color.rgb = p.get("color", RGBColor(0x25, 0x2B, 0x33))
        return tb

    def text(self, paras, gap=0.12, align=PP_ALIGN.LEFT):
        if isinstance(paras, (str, list)) and paras and isinstance(paras[0], str):
            # простая форма: список строк
            paras = [{"text": x} for x in paras]
        if isinstance(paras, dict):
            paras = [paras]
        h = paras_height(paras, self.w - 0.06)
        tb = self._tb(paras, self.y, h + 0.04, align)
        self.y += h + gap
        return tb

    def bullets(self, items, size=14, gap=0.12, color=RGBColor(0x25, 0x2B, 0x33), bullet="•"):
        paras = []
        for it in items:
            txt, sz, bd = (it + (size, False))[:3] if isinstance(it, tuple) else (it, size, False)
            paras.append({"text": f"{bullet} {txt}", "size": sz, "bold": bool(bd), "color": color,
                          "space_after": 7, "line_spacing": 1.12})
        return self.text(paras, gap=gap)

    def image(self, name, gap=0.10, max_h=None, img_dir=None):
        from PIL import Image
        p = os.path.join(img_dir, name)
        iw, ih = Image.open(p).size
        h = self.w / (iw / ih)
        if max_h and h > max_h:
            h = max_h
            w = h * (iw / ih)
        else:
            w = self.w
        x = self.x + (self.w - w) / 2
        pic = self.s.shapes.add_picture(p, Inches(x), Inches(self.y), Inches(w), Inches(h))
        self.y += h + gap
        return pic

    def caption(self, txt, size=10.5, gap=0.14):
        return self.text([{"text": txt, "size": size, "align": PP_ALIGN.CENTER,
                           "color": RGBColor(0x6B, 0x74, 0x80), "italic": True,
                           "line_spacing": 1.1, "space_after": 0}], gap=gap)

    # ---------- блоки с фоном ----------
    def box(self, h, fill=RGBColor(0xF2, 0xF5, 0xF9), line=None, lw=1.0, gap=0.14):
        sh = self.s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(self.x), Inches(self.y),
                                     Inches(self.w), Inches(h))
        sh.adjustments[0] = 0.05
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
        if line:
            sh.line.color.rgb = line
            sh.line.width = Pt(lw)
        else:
            sh.line.fill.background()
        sh.shadow.inherit = False
        self.y += h + gap
        return sh

    def card(self, title, body, title_size=14, body_size=13, fill=RGBColor(0xF2, 0xF5, 0xF9),
             accent=RGBColor(0x1F, 0x4E, 0x79), gap=0.14, pad=0.10, title_color=None,
             body_color=RGBColor(0x3A, 0x42, 0x4C)):
        paras = [{"text": title, "size": title_size, "bold": True,
                  "color": title_color or accent, "space_after": 4}]
        if body:
            paras.append({"text": body, "size": body_size, "color": body_color,
                          "line_spacing": 1.12, "space_after": 2})
        inner_w = self.w - 2 * pad - 0.06
        h = paras_height(paras, inner_w) + 2 * pad + 0.06
        self.box(h, fill=fill)
        top = self.y - h - gap + pad
        tb = self.s.shapes.add_textbox(Inches(self.x + pad), Inches(top), Inches(inner_w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = 0
        tf.margin_top = tf.margin_bottom = 0
        first = True
        for p in paras:
            para = tf.paragraphs[0] if first else tf.add_paragraph()
            first = False
            para.space_after = Pt(p.get("space_after", 4))
            para.line_spacing = p.get("line_spacing", 1.15)
            r = para.add_run()
            r.text = p["text"]
            r.font.name = "Calibri"
            r.font.size = Pt(p["size"])
            r.font.bold = p.get("bold", False)
            r.font.italic = p.get("italic", False)
            r.font.color.rgb = p["color"]
        self.y += gap
        return tb

    def fact(self, txt, gap=0.14):
        """Плашка «Интересный факт»."""
        paras = [{"text": txt, "size": 13, "color": RGBColor(0x7A, 0x2E, 0x20),
                  "space_after": 0, "line_spacing": 1.12}]
        inner_w = self.w - 0.72
        h = paras_height(paras, inner_w) + 0.36
        sh = self.box(h, fill=RGBColor(0xFD, 0xF3, 0xE7), line=RGBColor(0xE8, 0xB1, 0x63), lw=1.25, gap=gap)
        top = self.y - h - gap + 0.16
        badge = self.s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(self.x + 0.12),
                                        Inches(top + 0.02), Inches(0.42), Inches(0.28))
        badge.adjustments[0] = 0.3
        badge.fill.solid()
        badge.fill.fore_color.rgb = RGBColor(0xE8, 0xB1, 0x63)
        badge.line.fill.background()
        badge.shadow.inherit = False
        tfb = badge.text_frame
        tfb.margin_left = tfb.margin_right = 0
        tfb.margin_top = tfb.margin_bottom = 0
        pb = tfb.paragraphs[0]
        pb.alignment = PP_ALIGN.CENTER
        rb = pb.add_run()
        rb.text = "!"
        rb.font.size = Pt(12)
        rb.font.bold = True
        rb.font.name = "Calibri"
        rb.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        tb = self.s.shapes.add_textbox(Inches(self.x + 0.66), Inches(top), Inches(inner_w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = 0
        tf.margin_top = tf.margin_bottom = 0
        para = tf.paragraphs[0]
        para.space_after = Pt(0)
        para.line_spacing = 1.12
        r = para.add_run()
        r.text = txt
        r.font.name = "Calibri"
        r.font.size = Pt(13)
        r.font.color.rgb = RGBColor(0x7A, 0x2E, 0x20)
        self.y += gap
        return sh

    def table(self, rows, col_w=None, font=11, header_font=11.5, row_h=None,
              header_fill=RGBColor(0x1F, 0x4E, 0x79), zebra=RGBColor(0xF4, 0xF7, 0xFB), gap=0.14):
        nr, nc = len(rows), len(rows[0])
        shape = self.s.shapes.add_table(nr, nc, Inches(self.x), Inches(self.y), Inches(self.w), Inches(0.5))
        tbl = shape.table
        total = sum(col_w) if col_w else nc
        for i in range(nc):
            tbl.columns[i].width = Emu(int(Inches(self.w) * ((col_w[i] if col_w else 1) / total)))
        heights = []
        for r in range(nr):
            need = (row_h[r] if row_h and r < len(row_h) else 0.30)
            for c in range(nc):
                cw = (col_w[c] if col_w else 1) / total * self.w - 0.16
                sz = header_font if r == 0 else font
                lines = len(wrap_lines(str(rows[r][c]), cw, sz, r == 0))
                need = max(need, lines * sz * 1.22 / 72.0 + 0.09)
            heights.append(need)
            tbl.rows[r].height = Emu(int(Inches(need)))
        for r in range(nr):
            for c in range(nc):
                cell = tbl.cell(r, c)
                cell.margin_left = Inches(0.08)
                cell.margin_right = Inches(0.08)
                cell.margin_top = Inches(0.03)
                cell.margin_bottom = Inches(0.03)
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                cell.fill.solid()
                cell.fill.fore_color.rgb = header_fill if r == 0 else (RGBColor(0xFF, 0xFF, 0xFF) if r % 2 else zebra)
                tf = cell.text_frame
                tf.word_wrap = True
                p = tf.paragraphs[0]
                run = p.add_run()
                run.text = str(rows[r][c])
                run.font.name = "Calibri"
                run.font.size = Pt(header_font if r == 0 else font)
                run.font.bold = (r == 0)
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if r == 0 else RGBColor(0x25, 0x2B, 0x33)
        self.y += sum(heights) + gap
        return tbl

    def space(self, v=0.15):
        self.y += v
        return self

    @property
    def bottom(self):
        return self.y
