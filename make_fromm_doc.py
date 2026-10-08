# -*- coding: utf-8 -*-
"""Собирает .docx-сообщение об Эрихе Фромме (~1 стр. A4, простой язык)."""
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, Cm, RGBColor
from docx.oxml.ns import qn

ACCENT = RGBColor(0x1F, 0x4E, 0x79)   # тёмно-синий для заголовков
GREY = RGBColor(0x59, 0x59, 0x59)

doc = Document()

# --- страница и стиль по умолчанию ---
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.top_margin = sec.bottom_margin = Cm(2.0)
sec.left_margin = sec.right_margin = Cm(2.2)

normal = doc.styles["Normal"]
normal.font.name = "Times New Roman"
normal.font.size = Pt(12)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.15
normal.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")


def title(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = ACCENT
    p.paragraph_format.space_after = Pt(2)
    return p


def subtitle(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.italic = True
    r.font.size = Pt(10.5)
    r.font.color.rgb = GREY
    p.paragraph_format.space_after = Pt(10)
    return p


def heading(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(12.5)
    r.font.color.rgb = ACCENT
    p.paragraph_format.space_before = Pt(7)
    p.paragraph_format.space_after = Pt(3)
    return p


def para(text):
    p = doc.add_paragraph(text)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.first_line_indent = Cm(1.0)
    return p


def fact(num, lead, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Cm(0.7)
    p.paragraph_format.space_after = Pt(4)
    r1 = p.add_run(f"{num}. {lead} ")
    r1.bold = True
    r1.font.color.rgb = ACCENT
    p.add_run(text)
    return p


def epigraph(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.italic = True
    r.font.size = Pt(11)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    return p


# ------------------------------------------------------------------ СОДЕРЖАНИЕ
title("Эрих Фромм")
subtitle("философ о свободе и любви • 1900–1980")

para(
    "Эрих Фромм (1900–1980) — немецкий и американский психолог и философ. Он изучал, как "
    "общество меняет человека. Его главная мысль простая: свободу и любовь не получают в "
    "готовом виде — им учатся."
)

heading("Детство")
para(
    "Эрих родился 23 марта 1900 года во Франкфурте-на-Майне, в религиозной еврейской семье, и "
    "был единственным ребёнком. Отец торговал вином, мать мечтала, что сын станет музыкантом, "
    "а дед и прадед были раввинами. Дома было строго и тревожно. В 14 лет началась Первая "
    "мировая война, и мальчик не понимал, почему люди убивают друг друга. С этого вопроса и "
    "началась его философия."
)

heading("Учёба и работа")
para(
    "Сначала Эрих учился на юриста, но быстро понял, что это не его. Он перешёл в "
    "Гейдельбергский университет и выбрал социологию, психологию и философию; в 1922 году "
    "защитил диплом под руководством Альфреда Вебера. Затем увлёкся психоанализом — учением "
    "Фрейда — и стал помогать людям. С 1930 года он работал в Институте социальных "
    "исследований во Франкфурте, а когда к власти пришли нацисты, уехал в США, потом в Мексику."
)

heading("Семья")
para(
    "Фромм был женат трижды. Первая жена Фрида была старше его на десять лет и открыла ему "
    "психоанализ. Вторая, Хенни, тяжело болела — ради неё они и переехали в Мексику, где она "
    "вскоре умерла. Третья, Аннис, прожила с ним 27 лет. Своих детей не было, зато всю жизнь "
    "Фромм любил музыку и пел."
)

heading("Восемь интересных фактов")

fact(1, "Предсказал будущее.",
     "В 1932 году Фромм опросил немецких рабочих: станут ли они бороться с Гитлером? Он ответил "
     "— нет, не станут. Через год так и вышло.")
fact(2, "Главная книга.",
     "В 1941 году вышло «Бегство от свободы». Фромм объяснил: свобода — трудная вещь, поэтому от "
     "неё убегают — кто в подчинение сильному, кто в злость, а кто просто в жизнь «как все».")
fact(3, "Любовь — это умение.",
     "В книге «Искусство любить» (1956) он написал: любовь не падает с неба, её делают. В ней "
     "четыре части: забота, ответственность, уважение и знание.")
fact(4, "Уроки Востока.",
     "После смерти второй жены Фромм заинтересовался дзен-буддизмом и вместе с японским "
     "философом Судзуки написал книгу «Дзен-буддизм и психоанализ».")
fact(5, "Иметь или быть.",
     "В одноимённой книге 1976 года он сравнил две жизни: копить вещи или расти самому. "
     "Счастье, по его мысли, — во втором.")
fact(6, "Человек как товар.",
     "Фромм придумал выражение «рыночная личность»: в нашем мире человек часто продаёт себя, "
     "как вещь на полке, и ждёт, что его «купят».")
fact(7, "Любовь к живому.",
     "Фромм делил людей на тех, кого тянет к живому и растущему (он называл это биофилией), и "
     "тех, кого тянет к мёртвому и разрушению. Выбор, по Фромму, за нами.")
fact(8, "Борец за мир.",
     "Он выступал против ядерной гонки и войны во Вьетнаме, в 1966 году получил звание "
     "«Гуманист года». Умер Фромм 18 марта 1980 года — за пять дней до своего 80-летия.")

heading("Итог")
para(
    "Фромм учил: быть собой трудно, зато это и есть настоящая жизнь. Он верил, что человеку "
    "нужны не только вещи, но и смысл, надежда и любовь. И всему этому можно научиться — шаг "
    "за шагом, как любому делу."
)

epigraph("«Любовь — это не только отношение к одному человеку, а отношение ко всему миру».")

doc.core_properties.title = "Эрих Фромм — сообщение"
doc.core_properties.subject = "Философия: биография и идеи"

doc.save("Эрих_Фромм.docx")
print("saved")
