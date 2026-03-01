import { EditorView, Decoration } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"
import expressions from "../auxiliar/expressions"

//Efecto de añadir destacado al editor
export const addCommentMark = StateEffect.define()
//Efecto de borrar destacado al editor
export const removeCommentMark = StateEffect.define()

const getHighlightClass = (tag) => {
    if (tag === "temp-highlight") return "comment-highlight-temp-highlight";
    return expressions[tag].highlightClass || "comment-highlight"
}

//Almacena las decoraciones
export const commentField = StateField.define({

    //Al principio no hay decoraciones
    create() {
        return Decoration.none
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes)

        for (let effect of tr.effects) {
            if (effect.is(addCommentMark)) {
                decorations = decorations.update({
                    add: [Decoration.mark({
                        class: getHighlightClass(effect.value.tag),
                        attributes: { "data-comment-id": effect.value.id }
                    }).range(effect.value.from, effect.value.to)]
                })
            } else if (effect.is(removeCommentMark)) {
                decorations = decorations.update({
                    filter: (from, to, value) => {
                        return value.spec.attributes?.["data-comment-id"] !== effect.value
                    }
                })
            }
        }
        return decorations
    },
    provide: f => EditorView.decorations.from(f)
})