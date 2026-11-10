# LiveActivityTrackingWidget.swift

A TEMPLATE of the Live Activity UI (lock screen banner, Dynamic Island compact/expanded/minimal): add it to the Widget Extension target, never to the app (the podspec excludes it). It draws only what the app passed (title, labels, accent colour, deep link, numbers), uses SF Symbols chosen from the sport name (`sportSymbol`, a generic one for any sport without its own) and the system timer (`Text(date, style: .timer)`) while `status == "active"`. There are no resource or lproj files to maintain. Edit it freely: the module only needs the attributes.
