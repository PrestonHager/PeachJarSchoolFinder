# school_data.py
# by Preston Hager

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from fake_useragent import UserAgent
import json
import time

HELP_MESSAGE = """\t\t----- Retriving School Data from Google ------
\tUsage: python school_data.py [--option value] [-o v]\n
\t-o --open\tthe file to open and start from.
\t--save\t\tthe file to save to once finished.
\t--save-file
\t-s --start\tstart index for the list of schools in the JSON file.
\t-e --end\tend index for the list of school.
\t-h --help\tshow this help message."""

def search(school):
    global user_agent
    name = school["name"]
    city = school["city"]
    state = school["state"]
    if name == None:
        return "N/A"
    elif city == None:
        city = ""
    elif state == None:
        state = ""
    search_string = '+'.join([name, city, state, "how+many+students"])

    options = Options()
    ua = user_agent.random
    options.add_argument(f"user-agent={ua}")
    print("Initializing driver...")
    driver = webdriver.Chrome(options=options)
    print("DONE!\nFetching URL...")
    matched_elements = driver.get(f"https://www.google.com/search?q={search_string}")

    answer_element = driver.find_elements_by_class_name("XcVN5d");

    if len(answer_element) == 1:
        value = answer_element[0].text
    elif len(answer_element) == 0:
        value = "N/A"
    else:
        value = ' or '.join([e.text for e in answer_element])
    driver.close()
    return value

def main(all_schools, start_index=0, end_index=-1):
    global user_agent
    print("DONE!\nInitializing the User Agents...")
    user_agent = UserAgent(verify_ssl=False)
    print("DONE!\nInterating through schools...")
    # loop through each school and find how many students it has.
    if end_index < 0:
        end_index = len(all_schools)
    for s in range(start_index, end_index):
        school = all_schools[s]
        number_of_students = search(school)
        print(f"Found: '{number_of_students}' for school #{s+1}")
        school["total_students"] = number_of_students

if __name__ == '__main__':
    import plum
    import traceback
    # get the command arguments.
    arguments = plum.get_args({
        "open_file": ["-o", "--open"],
        "save_file": ["--save", "--save-file"],
        "start_index": ["-s", "--start"],
        "end_index": ["-e", "--end"],
        "help": ["-h", "--help"]
    }, defaults={
        "open_file": "schools.json",
        "save_file": "school_data.json",
        "start_index": 1,
        "end_index": -1,
        "help": False
    })
    # if the help was asked, then provide.
    if arguments["help"]:
        print(HELP_MESSAGE)
        quit()
    # open the file with all the schools in it.
    print("Opening JSON file...")
    with open(arguments["open_file"]) as f_in:
        all_schools = json.load(f_in)
    try:
        main(all_schools, arguments["start_index"]-1, arguments["end_index"])
    except KeyboardInterrupt:
        print("Keyboard Intterupt pressed. Stopping...")
    except Exception as err:
        # if an error occurs, we don't want to loose our work, so we save!
        print("An error occurred! Saving the current data...")
        traceback.print_tb(err.__traceback__)
        print(err)
    # save the schools with the new data.
    with open(arguments["save_file"], 'w') as f_out:
        json.dump(all_schools, f_out)
    print("DONE!")
