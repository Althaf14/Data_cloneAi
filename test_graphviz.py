
try:
    import graphviz
    dot = graphviz.Digraph(comment='The Test Table')
    dot.node('A', 'Test Node')
    dot.render('test-output/test-graph', format='png', view=False)
    print("Graphviz render successful")
except Exception as e:
    print(f"Graphviz render failed: {e}")
