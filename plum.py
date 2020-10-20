# plum.py
# by Preston Hager

from sys import argv

class Plum:
    def get_args(self, arguments, defaults):
        return_values = {k: defaults[k] for k in arguments}
        # inverse the argument dictionary so that we can compute faster.
        arguments_inversed = {}
        for argument in arguments:
            for command in arguments[argument]:
                arguments_inversed[command] = argument
        # loop through each arg in the argv and test it.
        current_arg = None
        for arg in argv:
            if current_arg != None:
                if arg.startswith("-"):
                    return_values[current_arg] = True
                else:
                    if type(arguments[current_arg]) == int:
                        try:
                            arg = int(arg)
                        except:
                            print(f"{current_arg} is meant to be an integer.")
                    return_values[current_arg] = arg
                current_arg = None
            elif arg in arguments_inversed:
                current_arg = arguments_inversed[arg]
        # if the current arg is still set we can assume it was a boolean and set it to true.
        if current_arg != None:
            return_values[current_arg] = True
        return return_values

_inst = Plum()
get_args = _inst.get_args

__all__ = ["get_args"]
