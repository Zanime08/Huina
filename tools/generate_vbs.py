# -*- coding: utf-8 -*-
"""Generate a Windows VBScript that builds Кадры-Студент.accdb in MS Access."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

# Seed is TypeScript; duplicate the control data here to keep VBS self-contained.
VBS = r'''Option Explicit
' Кадры-Студент, вариант 8 — создаёт настоящий .accdb в Microsoft Access
' Запуск: дважды щёлкнуть или  cscript //nologo "Создать_Кадры-Студент.vbs"

Dim acc, db, fso, outPath, scriptDir
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
If scriptDir = "" Then scriptDir = fso.GetAbsolutePathName(".")
outPath = scriptDir & "\Кадры-Студент.accdb"

On Error Resume Next
Set acc = CreateObject("Access.Application")
If Err.Number <> 0 Then
  MsgBox "Не найден Microsoft Access." & vbCrLf & vbCrLf & _
         "Откройте этот файл на компьютере, где установлен Access 2007/2010/2016/365.", _
         16, "Кадры-Студент"
  WScript.Quit 1
End If
On Error GoTo 0

acc.Visible = False
acc.UserControl = False
If fso.FileExists(outPath) Then fso.DeleteFile outPath, True

' 12 = acNewDatabaseFormatAccess2007 (.accdb)
acc.NewCurrentDatabase outPath, 12
Set db = acc.CurrentDb

db.Execute "CREATE TABLE [Отделы] ([КодОтдела] COUNTER CONSTRAINT pkОтделы PRIMARY KEY, [НаименованиеОтдела] TEXT(25) NOT NULL)"
db.Execute "CREATE TABLE [РежимРаботы] ([РежимРаботы] COUNTER CONSTRAINT pkРежим PRIMARY KEY, [НаименованиеРежимаРаботы] TEXT(40) NOT NULL, [ПроцентПремии] LONG NOT NULL)"
db.Execute "CREATE TABLE [Должности] ([КодДолжности] COUNTER CONSTRAINT pkДолж PRIMARY KEY, [НаименованиеДолжности] TEXT(40) NOT NULL, [РежимРаботы] LONG NOT NULL)"
db.Execute "CREATE TABLE [Сотрудники] ([ТабНомер] COUNTER CONSTRAINT pkСотр PRIMARY KEY, [ФИО] TEXT(50) NOT NULL, [КодОтдела] LONG NOT NULL, [КодДолжности] LONG NOT NULL, [Оклад] CURRENCY NOT NULL, [Иногородний] YESNO NOT NULL, [Пол] TEXT(3) NOT NULL, [ДатаПриема] DATETIME NOT NULL, [ВидРаботы] LONG NOT NULL, [ЧленПрофсоюза] YESNO NOT NULL)"
db.Execute "CREATE TABLE [Телефоны] ([ТабНомер] LONG NOT NULL, [КодТелефона] COUNTER, [НомерТелефона] TEXT(11) NOT NULL, [ТипТелефона] TEXT(10) NOT NULL, CONSTRAINT pkТел PRIMARY KEY ([ТабНомер],[КодТелефона]))"
db.Execute "CREATE TABLE [Отпуска] ([ТабНомер] LONG NOT NULL, [ДатаНачалаОтпуска] DATETIME NOT NULL, [ВидОтпуска] TEXT(40) NOT NULL, [КоличествоДней] LONG NOT NULL, [ОплатаЗаДень] CURRENCY NOT NULL, CONSTRAINT pkОтп PRIMARY KEY ([ТабНомер],[ДатаНачалаОтпуска]))"

Call SetFieldProps("Отделы", "НаименованиеОтдела", 25, "", "", True, False, "", "")
Call SetFieldProps("Сотрудники", "Оклад", 0, "Currency", ">=7800 And <50000", True, False, "Ошибка! Оклад может быть от 7800 до 50000", "")
Call SetFieldProps("Сотрудники", "ДатаПриема", 0, "Medium Date", "", True, False, "", "Date()")
Call SetFieldProps("Сотрудники", "ФИО", 50, "", "", True, False, "", "")
Call SetFieldProps("Сотрудники", "Пол", 3, "", "", True, False, "", "")
Call SetFieldProps("Телефоны", "НомерТелефона", 11, "", "", True, False, "", "")
Call SetFieldProps("Отпуска", "ДатаНачалаОтпуска", 0, "Medium Date", "", True, False, "", "")
Call SetFieldProps("Отпуска", "ОплатаЗаДень", 0, "Currency", ">=1000", True, False, "Оплата за день должна быть больше или равна 1000", "1000")
Call SetFieldProps("РежимРаботы", "ПроцентПремии", 0, "", ">=0 And <=100", True, False, "Процент премии может быть от 0 до 100", "")

Call LookupValue("Телефоны", "ТипТелефона", "раб.;дом.;сот.")
Call LookupValue("Сотрудники", "Пол", "муж;жен")
Call LookupValue("Отпуска", "ВидОтпуска", "очередной;учебный;без сохранения зарплаты")
Call LookupValue("РежимРаботы", "ПроцентПремии", "20;35;55")
Call LookupTable("Сотрудники", "КодОтдела", "Отделы", "КодОтдела", "НаименованиеОтдела")
Call LookupTable("Сотрудники", "КодДолжности", "Должности", "КодДолжности", "НаименованиеДолжности")
Call LookupTable("Должности", "РежимРаботы", "РежимРаботы", "РежимРаботы", "НаименованиеРежимаРаботы")
Call LookupTable("Телефоны", "ТабНомер", "Сотрудники", "ТабНомер", "ФИО")
Call LookupTable("Отпуска", "ТабНомер", "Сотрудники", "ТабНомер", "ФИО")

db.Execute "INSERT INTO [РежимРаботы] ([РежимРаботы],[НаименованиеРежимаРаботы],[ПроцентПремии]) VALUES (1,'5-ти дневная неделя',20)"
db.Execute "INSERT INTO [РежимРаботы] ([РежимРаботы],[НаименованиеРежимаРаботы],[ПроцентПремии]) VALUES (2,'6-ти дневная неделя',35)"
db.Execute "INSERT INTO [РежимРаботы] ([РежимРаботы],[НаименованиеРежимаРаботы],[ПроцентПремии]) VALUES (3,'сменный по 12 часов',55)"
db.Execute "INSERT INTO [Отделы] ([КодОтдела],[НаименованиеОтдела]) VALUES (1,'Администрация')"
db.Execute "INSERT INTO [Отделы] ([КодОтдела],[НаименованиеОтдела]) VALUES (2,'Бухгалтерия')"
db.Execute "INSERT INTO [Отделы] ([КодОтдела],[НаименованиеОтдела]) VALUES (3,'Производство')"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (1,'Директор',1)"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (2,'Главный бухгалтер',1)"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (3,'Секретарь',1)"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (4,'Инженер',2)"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (5,'Токарь',3)"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (6,'Слесарь',3)"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (7,'Менеджер',1)"
db.Execute "INSERT INTO [Должности] ([КодДолжности],[НаименованиеДолжности],[РежимРаботы]) VALUES (8,'Экономист',1)"

db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (1,'Кузнецов Иван Иванович',1,1,45000,False,'муж',#3/12/1998#,1,True)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (2,'Козлова Анна Сергеевна',2,2,32000,False,'жен',#6/20/2001#,1,True)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (3,'Тихонова Мария Викторовна',1,3,15000,True,'жен',#4/11/2003#,1,True)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (4,'Тарасов Пётр Алексеевич',3,4,28000,True,'муж',#9/1/2004#,1,True)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (5,'Кравцова Елена Владимировна',1,7,22000,True,'жен',#2/15/2005#,1,False)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (6,'Терентьева Ольга Игоревна',2,8,21000,True,'жен',#1/10/2013#,1,True)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (7,'Смирнов Алексей Павлович',3,5,18000,False,'муж',#5/22/2014#,1,True)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (8,'Новикова Наталья Сергеевна',3,6,17500,False,'жен',#8/3/2015#,2,False)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (9,'Орлов Дмитрий Николаевич',3,5,19000,True,'муж',#3/14/2016#,2,True)"
db.Execute "INSERT INTO [Сотрудники] ([ТабНомер],[ФИО],[КодОтдела],[КодДолжности],[Оклад],[Иногородний],[Пол],[ДатаПриема],[ВидРаботы],[ЧленПрофсоюза]) VALUES (10,'Павлова Лидия Григорьевна',1,3,16000,False,'жен',#9/1/2018#,1,True)"

db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (1,1,'84951230001','дом.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (1,2,'84951231111','раб.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (2,3,'84951232222','раб.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (3,4,'84951233333','раб.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (4,5,'84951234444','раб.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (5,6,'84951235555','раб.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (6,7,'89031110001','сот.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (6,8,'89031110002','сот.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (7,9,'89032220001','сот.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (7,10,'89032220002','сот.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (8,11,'89033330001','сот.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (9,12,'89034440001','сот.')"
db.Execute "INSERT INTO [Телефоны] ([ТабНомер],[КодТелефона],[НомерТелефона],[ТипТелефона]) VALUES (10,13,'89035550001','сот.')"

db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (1,#7/6/2026#,'очередной',28,1800)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (2,#8/3/2026#,'очередной',28,1600)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (3,#6/1/2026#,'очередной',14,1200)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (7,#7/13/2026#,'очередной',14,1400)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (10,#9/1/2026#,'очередной',14,1100)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (4,#5/12/2026#,'очередной',14,1500)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (4,#2/2/2026#,'учебный',10,1300)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (5,#8/17/2026#,'очередной',14,1400)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (5,#3/10/2026#,'учебный',7,1200)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (8,#6/15/2026#,'очередной',14,1200)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (8,#4/6/2026#,'учебный',10,1000)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (6,#7/20/2026#,'очередной',14,1400)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (6,#1/12/2026#,'без сохранения зарплаты',5,1000)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (6,#11/2/2026#,'учебный',8,1100)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (9,#8/10/2026#,'очередной',14,1300)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (9,#2/16/2026#,'без сохранения зарплаты',4,1000)"
db.Execute "INSERT INTO [Отпуска] ([ТабНомер],[ДатаНачалаОтпуска],[ВидОтпуска],[КоличествоДней],[ОплатаЗаДень]) VALUES (9,#10/5/2026#,'учебный',10,1200)"

On Error Resume Next
acc.DoCmd.RunCommand 204  ' acCmdRelationships — ignore if fails
On Error GoTo 0

Dim rel
Set rel = db.CreateRelation("ОтделыСотрудники", "Отделы", "Сотрудники", 2)
rel.Fields.Append rel.CreateField("КодОтдела")
rel.Fields("КодОтдела").ForeignName = "КодОтдела"
db.Relations.Append rel

Set rel = db.CreateRelation("ДолжностиСотрудники", "Должности", "Сотрудники", 2)
rel.Fields.Append rel.CreateField("КодДолжности")
rel.Fields("КодДолжности").ForeignName = "КодДолжности"
db.Relations.Append rel

Set rel = db.CreateRelation("СотрудникиТелефоны", "Сотрудники", "Телефоны", 2)
rel.Fields.Append rel.CreateField("ТабНомер")
rel.Fields("ТабНомер").ForeignName = "ТабНомер"
db.Relations.Append rel

Set rel = db.CreateRelation("РежимДолжности", "РежимРаботы", "Должности", 2)
rel.Fields.Append rel.CreateField("РежимРаботы")
rel.Fields("РежимРаботы").ForeignName = "РежимРаботы"
db.Relations.Append rel

Set rel = db.CreateRelation("СотрудникиОтпуска", "Сотрудники", "Отпуска", 2)
rel.Fields.Append rel.CreateField("ТабНомер")
rel.Fields("ТабНомер").ForeignName = "ТабНомер"
db.Relations.Append rel

Call AddQuery("Запрос1 с сортировкой", "SELECT ФИО, ДатаПриема, Оклад FROM Сотрудники ORDER BY ДатаПриема DESC")
Call AddQuery("Запрос2 с условием", "SELECT ФИО, ДатаПриема, Оклад FROM Сотрудники WHERE ДатаПриема>#1/1/2012# ORDER BY ДатаПриема DESC")
Call AddQuery("Запрос3 на буквы", "SELECT ФИО, Пол, Оклад FROM Сотрудники WHERE ФИО Like ""Т*"" Or ФИО Like ""К*"" ORDER BY ФИО")
Call AddQuery("Запрос4 с вычислением", "SELECT ФИО, ДатаПриема, Year(Date())-Year(ДатаПриема) AS Стаж FROM Сотрудники ORDER BY Year(Date())-Year(ДатаПриема)")
Call AddQuery("Запрос5 с отделом", "SELECT Сотрудники.ФИО, Отделы.НаименованиеОтдела, Сотрудники.Оклад, Сотрудники.ДатаПриема FROM Сотрудники INNER JOIN Отделы ON Сотрудники.КодОтдела=Отделы.КодОтдела ORDER BY Сотрудники.ФИО")
Call AddQuery("Запрос6 с параметром", "SELECT Отделы.НаименованиеОтдела, Сотрудники.ФИО, Сотрудники.ДатаПриема FROM Сотрудники INNER JOIN Отделы ON Сотрудники.КодОтдела=Отделы.КодОтдела WHERE Отделы.НаименованиеОтдела=[Введите отдел] ORDER BY Сотрудники.ДатаПриема")
Call AddQuery("Запрос с условием", "SELECT Сотрудники.ТабНомер, Сотрудники.ФИО, Отделы.НаименованиеОтдела, Сотрудники.Оклад, Сотрудники.Иногородний FROM Сотрудники INNER JOIN Отделы ON Сотрудники.КодОтдела=Отделы.КодОтдела WHERE (Сотрудники.ФИО Like ""Т*"" Or Сотрудники.ФИО Like ""К*"") AND Сотрудники.Оклад>16000 ORDER BY Сотрудники.ФИО")
Call AddQuery("Запрос с параметром", "SELECT Сотрудники.ТабНомер, Сотрудники.ФИО, Сотрудники.Оклад, РежимРаботы.НаименованиеРежимаРаботы, РежимРаботы.ПроцентПремии, [Оклад]+[Оклад]*[ПроцентПремии]/100 AS Зарплата, Отпуска.ВидОтпуска, Отпуска.ДатаНачалаОтпуска FROM ((Сотрудники INNER JOIN Должности ON Сотрудники.КодДолжности=Должности.КодДолжности) INNER JOIN РежимРаботы ON Должности.РежимРаботы=РежимРаботы.РежимРаботы) INNER JOIN Отпуска ON Сотрудники.ТабНомер=Отпуска.ТабНомер WHERE Отпуска.ВидОтпуска=[Вид отпуска] ORDER BY РежимРаботы.НаименованиеРежимаРаботы, Отпуска.ДатаНачалаОтпуска")
Call AddQuery("Премия сотрудников", "SELECT Отделы.НаименованиеОтдела, Сотрудники.ТабНомер, Сотрудники.ФИО, Должности.НаименованиеДолжности, Сотрудники.Оклад, РежимРаботы.ПроцентПремии, [Оклад]*[ПроцентПремии]/100 AS Премия FROM ((Сотрудники INNER JOIN Отделы ON Сотрудники.КодОтдела=Отделы.КодОтдела) INNER JOIN Должности ON Сотрудники.КодДолжности=Должности.КодДолжности) INNER JOIN РежимРаботы ON Должности.РежимРаботы=РежимРаботы.РежимРаботы ORDER BY Отделы.НаименованиеОтдела, Сотрудники.ФИО")
Call AddQuery("Запрос T-2", "SELECT ТабНомер, ФИО, Пол, ДатаПриема, Оклад, Иногородний, ЧленПрофсоюза, IIf(ВидРаботы=1,'основная','по совместительству') AS ВидРаботыТекст FROM Сотрудники")

' --- Формы, отчёты, кнопочное меню ---
Call MakeForm("Справочник отделов", "Отделы", "КодОтдела|НаименованиеОтдела", "Код отдела|Наименование отдела", True)
Call MakeForm("Ввод отдела", "Отделы", "КодОтдела|НаименованиеОтдела", "Код отдела|Наименование отдела", False)
Call MakeForm("Справочник должностей", "Должности", "КодДолжности|НаименованиеДолжности|РежимРаботы", "Код должности|Наименование должности|Режим работы", True)
Call MakeForm("Ввод должности", "Должности", "КодДолжности|НаименованиеДолжности|РежимРаботы", "Код должности|Наименование должности|Режим работы", False)
Call MakeForm("Справочник режимов работы", "РежимРаботы", "РежимРаботы|НаименованиеРежимаРаботы|ПроцентПремии", "Режим работы|Наименование режима работы|Процент премии", True)
Call MakeEmployeeForm()
Call MakeSubForm("Телефоны подчинённая форма", "Телефоны", "НомерТелефона|ТипТелефона", "Номер телефона|Тип телефона")
Call MakeSubForm("Отпуска подчинённая форма", "Отпуска", "ДатаНачалаОтпуска|ВидОтпуска|КоличествоДней|ОплатаЗаДень", "Дата начала|Вид отпуска|Дней|Оплата за день")
Call MakeComposite("Телефоны сотрудников", "Сотрудники", "ТабНомер|ФИО|КодОтдела|КодДолжности", "Таб. номер|ФИО|Отдел|Должность", "Телефоны подчинённая форма")
Call MakeComposite("Отпуска сотрудников", "Сотрудники", "ТабНомер|ФИО|КодДолжности|Оклад|Иногородний", "Таб. номер|ФИО|Должность|Оклад|Иногородний", "Отпуска подчинённая форма")
Call MakeReport("Премия сотрудников", "Премия сотрудников")
Call MakeReport("Список сотрудников с окладом больше 16000", "Запрос с условием")
Call MakeReport("Отпуска сотрудников", "Запрос с параметром")
Call MakeReport("Карточка сотрудника", "Запрос T-2")
Call MakeSwitchboard()

acc.CloseCurrentDatabase
acc.Quit
Set db = Nothing
Set acc = Nothing

MsgBox "Готово!" & vbCrLf & vbCrLf & outPath & vbCrLf & vbCrLf & _
       "Создано: таблицы, свойства, подстановки, связи, данные вар. 8," & vbCrLf & _
       "запросы, формы (в т.ч. составные), отчёты и кнопочная форма." & vbCrLf & vbCrLf & _
       "Открой файл в Access — стартовая форма: Кнопочная форма.", 64, "Кадры-Студент"

WScript.Quit 0

Sub AddQuery(qName, qSql)
  Dim qdf
  On Error Resume Next
  db.QueryDefs.Delete qName
  On Error GoTo 0
  Set qdf = db.CreateQueryDef(qName, qSql)
End Sub

Sub SetFieldProps(tName, fName, size, fmt, rule, req, allowZ, vtext, defv)
  Dim td, fld, p
  Set td = db.TableDefs(tName)
  Set fld = td.Fields(fName)
  On Error Resume Next
  If fmt <> "" Then fld.Properties("Format").Value = fmt
  If Err.Number <> 0 Then
    Err.Clear
    Set p = fld.CreateProperty("Format", 10, fmt)
    fld.Properties.Append p
  End If
  Err.Clear
  If rule <> "" Then fld.ValidationRule = rule
  If vtext <> "" Then fld.ValidationText = vtext
  fld.Required = req
  If defv <> "" Then fld.DefaultValue = defv
  If size > 0 Then
    fld.AllowZeroLength = allowZ
  End If
  On Error GoTo 0
End Sub

Sub LookupValue(tName, fName, list)
  Dim fld, p
  Set fld = db.TableDefs(tName).Fields(fName)
  On Error Resume Next
  Set p = fld.CreateProperty("DisplayControl", 3, 111)
  fld.Properties.Append p
  Set p = fld.CreateProperty("RowSourceType", 10, "Value List")
  fld.Properties.Append p
  Set p = fld.CreateProperty("RowSource", 10, list)
  fld.Properties.Append p
  Set p = fld.CreateProperty("LimitToList", 1, True)
  fld.Properties.Append p
  On Error GoTo 0
End Sub

Sub LookupTable(tName, fName, srcTable, boundF, dispF)
  Dim fld, p, sql
  sql = "SELECT [" & boundF & "], [" & dispF & "] FROM [" & srcTable & "] ORDER BY [" & dispF & "]"
  Set fld = db.TableDefs(tName).Fields(fName)
  On Error Resume Next
  Set p = fld.CreateProperty("DisplayControl", 3, 111)
  fld.Properties.Append p
  Set p = fld.CreateProperty("RowSourceType", 10, "Table/Query")
  fld.Properties.Append p
  Set p = fld.CreateProperty("RowSource", 10, sql)
  fld.Properties.Append p
  Set p = fld.CreateProperty("BoundColumn", 3, 1)
  fld.Properties.Append p
  Set p = fld.CreateProperty("ColumnCount", 3, 2)
  fld.Properties.Append p
  Set p = fld.CreateProperty("ColumnWidths", 10, "0cm;3cm")
  fld.Properties.Append p
  Set p = fld.CreateProperty("LimitToList", 1, True)
  fld.Properties.Append p
  On Error GoTo 0
End Sub

Function SplitPipe(s)
  SplitPipe = Split(s, "|")
End Function

Sub SaveRenameForm(tmpName, newName)
  On Error Resume Next
  acc.DoCmd.Save 2, tmpName
  acc.DoCmd.Close 2, tmpName, 1
  acc.DoCmd.Rename newName, 2, tmpName
  Err.Clear
  On Error GoTo 0
End Sub

Sub MakeForm(frmCaption, recSrc, fieldStr, capStr, splitView)
  Dim frm, nm, fields, caps, i, top, lbl, ctl
  On Error Resume Next
  Set frm = acc.CreateForm()
  If Err.Number <> 0 Then Exit Sub
  nm = frm.Name
  frm.Caption = frmCaption
  frm.RecordSource = recSrc
  frm.DefaultView = 0
  If splitView Then
    frm.DefaultView = 5
  End If
  fields = SplitPipe(fieldStr)
  caps = SplitPipe(capStr)
  top = 300
  For i = 0 To UBound(fields)
    Set lbl = acc.CreateControl(nm, 100, 0, , , 200, top, 2800, 280)
    lbl.Caption = caps(i)
    lbl.Name = "lbl" & i
    Set ctl = acc.CreateControl(nm, 109, 0, , fields(i), 3100, top, 4000, 320)
    ctl.ControlSource = fields(i)
    ctl.Name = "txt" & fields(i)
    If i = 0 Then ctl.Locked = True
    top = top + 420
  Next
  Call SaveRenameForm(nm, frmCaption)
  On Error GoTo 0
End Sub

Sub MakeSubForm(frmCaption, recSrc, fieldStr, capStr)
  Dim frm, nm, fields, caps, i, leftPos, lbl, ctl, w
  On Error Resume Next
  Set frm = acc.CreateForm()
  If Err.Number <> 0 Then Exit Sub
  nm = frm.Name
  frm.Caption = frmCaption
  frm.RecordSource = recSrc
  frm.DefaultView = 1
  frm.NavigationButtons = True
  fields = SplitPipe(fieldStr)
  caps = SplitPipe(capStr)
  leftPos = 100
  For i = 0 To UBound(fields)
    w = 1800
    If i = 0 Then w = 2200
    Set lbl = acc.CreateControl(nm, 100, 1, , , leftPos, 60, w, 240)
    lbl.Caption = caps(i)
    Set ctl = acc.CreateControl(nm, 109, 0, , fields(i), leftPos, 60, w, 300)
    ctl.ControlSource = fields(i)
    leftPos = leftPos + w + 80
  Next
  Call SaveRenameForm(nm, frmCaption)
  On Error GoTo 0
End Sub

Sub MakeComposite(frmCaption, recSrc, fieldStr, capStr, subName)
  Dim frm, nm, fields, caps, i, top, lbl, ctl, sf
  On Error Resume Next
  Set frm = acc.CreateForm()
  If Err.Number <> 0 Then Exit Sub
  nm = frm.Name
  frm.Caption = frmCaption
  frm.RecordSource = recSrc
  frm.DefaultView = 0
  fields = SplitPipe(fieldStr)
  caps = SplitPipe(capStr)
  top = 250
  For i = 0 To UBound(fields)
    Set lbl = acc.CreateControl(nm, 100, 0, , , 200, top, 2500, 280)
    lbl.Caption = caps(i)
    Set ctl = acc.CreateControl(nm, 109, 0, , fields(i), 2800, top, 3800, 320)
    ctl.ControlSource = fields(i)
    ctl.Locked = True
    top = top + 400
  Next
  Set sf = acc.CreateControl(nm, 112, 0, , , 200, top + 200, 7000, 2500)
  sf.SourceObject = subName
  sf.LinkMasterFields = "ТабНомер"
  sf.LinkChildFields = "ТабНомер"
  Call SaveRenameForm(nm, frmCaption)
  On Error GoTo 0
End Sub

Sub MakeEmployeeForm()
  Dim frm, nm, lbl, ctl, og, opt, lst
  On Error Resume Next
  Set frm = acc.CreateForm()
  If Err.Number <> 0 Then Exit Sub
  nm = frm.Name
  frm.Caption = "Справочник сотрудников"
  frm.RecordSource = "Сотрудники"
  frm.DefaultView = 5

  Set lbl = acc.CreateControl(nm, 100, 0, , , 200, 200, 2000, 280): lbl.Caption = "Таб.номер:"
  Set ctl = acc.CreateControl(nm, 109, 0, , "ТабНомер", 2300, 200, 2200, 320): ctl.ControlSource = "ТабНомер": ctl.Locked = True

  Set lbl = acc.CreateControl(nm, 100, 0, , , 200, 600, 2000, 280): lbl.Caption = "ФИО:"
  Set ctl = acc.CreateControl(nm, 109, 0, , "ФИО", 2300, 600, 3200, 320): ctl.ControlSource = "ФИО"

  Set lbl = acc.CreateControl(nm, 100, 0, , , 200, 1000, 2000, 280): lbl.Caption = "Член профсоюза:"
  Set ctl = acc.CreateControl(nm, 106, 0, , "ЧленПрофсоюза", 2300, 1000, 300, 300): ctl.ControlSource = "ЧленПрофсоюза"

  Set lbl = acc.CreateControl(nm, 100, 0, , , 200, 1450, 800, 280): lbl.Caption = "Пол"
  Set lst = acc.CreateControl(nm, 110, 0, , "Пол", 1100, 1400, 1600, 700)
  lst.ControlSource = "Пол"
  lst.RowSourceType = "Value List"
  lst.RowSource = "муж;жен"

  Set lbl = acc.CreateControl(nm, 100, 0, , , 4800, 200, 1800, 280): lbl.Caption = "Дата приема:"
  Set ctl = acc.CreateControl(nm, 109, 0, , "ДатаПриема", 6700, 200, 2200, 320): ctl.ControlSource = "ДатаПриема"

  Set lbl = acc.CreateControl(nm, 100, 0, , , 4800, 600, 1800, 280): lbl.Caption = "Отдел:"
  Set ctl = acc.CreateControl(nm, 111, 0, , "КодОтдела", 6700, 600, 2200, 320): ctl.ControlSource = "КодОтдела"

  Set lbl = acc.CreateControl(nm, 100, 0, , , 4800, 1000, 1800, 280): lbl.Caption = "Должность:"
  Set ctl = acc.CreateControl(nm, 111, 0, , "КодДолжности", 6700, 1000, 2200, 320): ctl.ControlSource = "КодДолжности"

  Set lbl = acc.CreateControl(nm, 100, 0, , , 4800, 1400, 1800, 280): lbl.Caption = "Оклад:"
  Set ctl = acc.CreateControl(nm, 109, 0, , "Оклад", 6700, 1400, 2200, 320): ctl.ControlSource = "Оклад"

  Set og = acc.CreateControl(nm, 107, 0, , , 4800, 1850, 4100, 900)
  og.ControlSource = "ВидРаботы"
  og.Name = "fraВидРаботы"
  Set opt = acc.CreateControl(nm, 105, 0, "fraВидРаботы", , 5000, 2000, 280, 280)
  opt.OptionValue = 1
  Set lbl = acc.CreateControl(nm, 100, 0, , , 5350, 2000, 2500, 280): lbl.Caption = "основная"
  Set opt = acc.CreateControl(nm, 105, 0, "fraВидРаботы", , 5000, 2400, 280, 280)
  opt.OptionValue = 2
  Set lbl = acc.CreateControl(nm, 100, 0, , , 5350, 2400, 3200, 280): lbl.Caption = "по совместительству"

  Set lbl = acc.CreateControl(nm, 100, 0, , , 200, 2300, 2000, 280): lbl.Caption = "Иногородний:"
  Set ctl = acc.CreateControl(nm, 106, 0, , "Иногородний", 2300, 2300, 300, 300): ctl.ControlSource = "Иногородний"

  Call SaveRenameForm(nm, "Справочник сотрудников")
  On Error GoTo 0
End Sub

Sub MakeReport(rptCaption, recSrc)
  Dim rpt, nm, lbl
  On Error Resume Next
  Set rpt = acc.CreateReport()
  If Err.Number <> 0 Then Exit Sub
  nm = rpt.Name
  rpt.Caption = rptCaption
  rpt.RecordSource = recSrc
  Set lbl = acc.CreateReportControl(nm, 100, 2, , , 400, 200, 8000, 500)
  lbl.Caption = rptCaption
  lbl.FontSize = 16
  lbl.FontBold = True
  acc.DoCmd.Save 3, nm
  acc.DoCmd.Close 3, nm, 1
  acc.DoCmd.Rename rptCaption, 3, nm
  On Error GoTo 0
End Sub

Sub MakeSwitchboard()
  Dim frm, nm, title, btn, top, i, captions, forms
  On Error Resume Next
  Set frm = acc.CreateForm()
  If Err.Number <> 0 Then Exit Sub
  nm = frm.Name
  frm.Caption = "Кнопочная форма"
  frm.RecordSelectors = False
  frm.NavigationButtons = False
  Set title = acc.CreateControl(nm, 100, 1, , , 400, 200, 7000, 500)
  title.Caption = "Главная кнопочная форма"
  title.FontSize = 18
  title.FontBold = True
  captions = Array("Справочник отделов", "Справочник должностей", "Справочник режимов работы", "Справочник сотрудников", "Телефоны сотрудников", "Отпуска сотрудников", "Премия сотрудников")
  forms = Array("Справочник отделов", "Справочник должностей", "Справочник режимов работы", "Справочник сотрудников", "Телефоны сотрудников", "Отпуска сотрудников", "Премия сотрудников")
  top = 300
  For i = 0 To 6
    Set btn = acc.CreateControl(nm, 104, 0, , , 800, top, 5000, 400)
    btn.Caption = captions(i)
    btn.HyperlinkSubAddress = "Form " & forms(i)
    If i = 6 Then btn.HyperlinkSubAddress = "Report Премия сотрудников"
    top = top + 480
  Next
  Call SaveRenameForm(nm, "Кнопочная форма")
  acc.SetOption "StartupForm", "Кнопочная форма"
  On Error GoTo 0
End Sub
'''

def main() -> None:
    root = Path(__file__).resolve().parents[1]
    public = root / "public"
    public.mkdir(exist_ok=True)
    out = public / "Создать_Кадры-Студент.vbs"
    out.write_text(VBS.lstrip("\n"), encoding="utf-16")
    cmd = public / "Создать_Кадры-Студент.cmd"
    cmd.write_text(
        "@echo off\r\n"
        "cscript //nologo \"%~dp0Создать_Кадры-Студент.vbs\"\r\n"
        "pause\r\n",
        encoding="utf-8",
    )
    print(f"wrote {out} ({out.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
